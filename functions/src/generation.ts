import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import express, { Request, Response } from "express";
import cors from "cors";
import { logger } from "firebase-functions";
import Replicate from "replicate";
import OpenAI from "openai";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://tokzic-mobile.firebaseio.com",
  });
}

// Initialize Firestore
const db = admin.firestore();

// Initialize Express app
const app = express();

// Enable CORS
app.use(cors({ origin: true }));

// Define configuration parameters via secrets
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const REPLICATE_API_KEY = defineSecret("REPLICATE_API_KEY");

// Constants
const OPENAI_MODEL = "gpt-3.5-turbo";
const MAX_DESCRIPTIONS = 50; // Limit number of descriptions to process

// Initialize clients
let replicateClient: Replicate | null = null;
let openaiClient: OpenAI | null = null;

/**
 * Initializes the Replicate client if not already initialized.
 * @return {Replicate} The initialized Replicate client
 */
function getReplicate(): Replicate {
  if (!replicateClient) {
    replicateClient = new Replicate({
      auth: REPLICATE_API_KEY.value(),
    });
  }
  return replicateClient;
}

/**
 * Initializes the OpenAI client if not already initialized.
 * @return {OpenAI} The initialized OpenAI client
 */
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY.value(),
    });
  }
  return openaiClient;
}

/**
 * Calls the OpenAI Chat API to generate a natural language prompt.
 * @param {string[]} liked Array of descriptions from videos the user liked
 * @param {string[]} disliked Array of descriptions from videos the user disliked
 * @return {Promise<string>} A natural language paragraph describing the video
 */
async function generateVideoPrompt(
  liked: string[],
  disliked: string[]
): Promise<string> {
  logger.info("[generation] Generating video prompt", {
    likedCount: liked.length,
    dislikedCount: disliked.length,
  });

  // Take most recent descriptions up to MAX_DESCRIPTIONS
  const recentLiked = liked.slice(-MAX_DESCRIPTIONS);
  const recentDisliked = disliked.slice(-MAX_DESCRIPTIONS);

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a creative copywriter skilled at generating compelling video descriptions. " +
            "Generate a natural language paragraph describing a vertical video that a user would enjoy. " +
            "The output should be a single paragraph.",
        },
        {
          role: "user",
          content:
            "Liked video descriptions:\n" +
            recentLiked.join("\n") +
            "\n\nDisliked video descriptions:\n" +
            recentDisliked.join("\n") +
            "\n\nGenerate a compelling video description:",
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) {
      throw new Error("OpenAI did not return a valid completion");
    }

    logger.info("[generation] Generated prompt", { prompt });
    return prompt;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[generation] Error generating prompt:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// Define the generation endpoint
app.post("/", async (req: Request, res: Response) => {
  logger.info("[generation] Received generation request", { body: req.body });
  // Log configuration at startup
  logger.info("[generation] Generation service configuration loaded", {
    openAiModel: OPENAI_MODEL,
    hasReplicateKey: !!REPLICATE_API_KEY.value(),
    hasOpenAIKey: !!OPENAI_API_KEY.value(),
  });

  const userId = req.body?.userId || req.query?.userId;
  if (!userId) {
    logger.warn("[generation] Missing userId in request");
    res.status(400).json({ error: "Missing userId parameter" });
    return;
  }

  try {
    // Query Firestore for the user's swipes
    logger.info("[generation] Querying Firestore for user swipes", { userId });
    const swipesSnapshot = await db
      .collection("swipes")
      .where("userId", "==", userId)
      .get();

    if (swipesSnapshot.empty) {
      logger.warn("[generation] No swipes found for user", { userId });
      res.status(404).json({ error: "No swipes found for user" });
      return;
    }

    // Process swipe documents
    const videoWeights: { [videoId: string]: number } = {};
    const swipeList: { videoId: string; direction: string }[] = [];
    swipesSnapshot.forEach((doc) => {
      const data = doc.data();
      const videoId = data.videoId;
      const direction = (data.direction || "").toLowerCase();
      if (!videoId || (direction !== "right" && direction !== "left")) {
        return;
      }
      swipeList.push({ videoId, direction });
      const weight = direction === "right" ? 1 : -1;
      videoWeights[videoId] = (videoWeights[videoId] || 0) + weight;
    });

    const videoIds = Object.keys(videoWeights);
    if (videoIds.length === 0) {
      logger.warn("[generation] No valid videoIds found for swipes");
      res.status(404).json({ error: "No valid swipes found for user" });
      return;
    }

    // Fetch video descriptions from Firestore
    logger.info("[generation] Fetching video descriptions", { videoCount: videoIds.length });
    const videoDocRefs = videoIds.map((videoId: string) =>
      db.collection("videos").doc(videoId)
    );
    const videoDocs = await db.getAll(...videoDocRefs);

    // Separate descriptions into liked and disliked arrays
    const likedDescriptions: string[] = [];
    const dislikedDescriptions: string[] = [];
    swipeList.forEach(({ videoId, direction }) => {
      const doc = videoDocs.find((d) => d.id === videoId);
      const videoData = doc?.data();
      if (videoData?.description) {
        if (direction === "right") {
          likedDescriptions.push(videoData.description);
        } else if (direction === "left") {
          dislikedDescriptions.push(videoData.description);
        }
      }
    });

    logger.info("[generation] Processed video descriptions", {
      likedCount: likedDescriptions.length,
      dislikedCount: dislikedDescriptions.length,
    });

    // Generate prompt using OpenAI's LLM
    const prompt = await generateVideoPrompt(likedDescriptions, dislikedDescriptions);

    // Get the base URL for the webhook
    const baseUrl = process.env.FIREBASE_FUNCTIONS_URL ||
                   `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net`;
    const encodedPrompt = encodeURIComponent(prompt);
    const webhookUrl = `${baseUrl}/generationWebhook?prompt=${encodedPrompt}`;

    // Initialize Replicate client and start prediction
    const replicate = getReplicate();

    logger.info("[generation] Starting Luma Ray video generation", {
      webhookUrl,
    });

    const prediction = await replicate.run("luma/ray", {
      input: {
        prompt,
        loop: false,
        aspect_ratio: "3:4",
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"],
    });

    if (!prediction) {
      throw new Error("Replicate API did not return a prediction");
    }

    logger.info("[generation] Luma Ray prediction initiated", { prediction });

    res.status(200).json({
      message: "Video generation started",
      prediction,
      debug: {
        processedSwipes: swipesSnapshot.size,
        validSwipes: videoIds.length,
        likedDescriptions: likedDescriptions.length,
        dislikedDescriptions: dislikedDescriptions.length,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[generation] Error in generation:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: errorMessage });
  }
});

// Export the Express app as a Cloud Function with v2 configuration
export const generation = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GiB",
    region: "us-central1",
    minInstances: 0,
    invoker: "public",
    secrets: [OPENAI_API_KEY, REPLICATE_API_KEY],
  },
  app
);
