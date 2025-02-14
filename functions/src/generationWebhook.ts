import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import express, { Request, Response } from "express";
import cors from "cors";
import { logger } from "firebase-functions";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import fetch from "node-fetch";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://tokzic-mobile.firebaseio.com",
  });
}

// Initialize Firestore and Storage
const db = admin.firestore();
const bucket = admin.storage().bucket("tokzic-mobile.firebasestorage.app");

// Initialize Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Define configuration parameters via secrets
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const PINECONE_API_KEY = defineSecret("PINECONE_API_KEY");

// Constants
const PINECONE_INDEX = "tokzic";
const VECTOR_DIM = 1536;
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

// Initialize clients
let pineconeClient: Pinecone | null = null;
let openaiClient: OpenAI | null = null;
let index: ReturnType<Pinecone["index"]> | null = null;

interface ReplicateWebhookPayload {
  id: string;
  status: string;
  output: string | string[];
  error?: string;
  prompt: string;
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
 * Initializes the Pinecone client if not already initialized.
 * @return {boolean} True if initialization was successful, false otherwise
 */
function initializePinecone(): boolean {
  if (!PINECONE_API_KEY.value()) {
    logger.error("Missing Pinecone API key");
    return false;
  }

  try {
    if (!pineconeClient) {
      pineconeClient = new Pinecone({
        apiKey: PINECONE_API_KEY.value(),
      });
      index = pineconeClient.index(PINECONE_INDEX);
    }

    logger.info("Pinecone client initialized", {
      indexName: PINECONE_INDEX,
      hasClient: !!pineconeClient,
      hasIndex: !!index,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error initializing Pinecone:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

/**
 * Helper function to generate an embedding for the given text using OpenAI.
 * @param {string} text The text to generate an embedding for
 * @return {Promise<number[]>} A vector of dimension 1536
 */
async function getEmbeddingForText(text: string): Promise<number[]> {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
      dimensions: VECTOR_DIM,
    });

    const embedding = response.data[0].embedding;
    logger.info("Generated embedding", {
      textLength: text.length,
      embeddingLength: embedding.length,
    });

    return embedding;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error generating embedding:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Webhook endpoint to handle Replicate's callback after video generation is complete.
 * Processes the generated video, updates Firestore, and upserts the new video into Pinecone.
 */
app.post("/", async (req: Request, res: Response) => {
  // Log configuration at startup
  logger.info("Generation service configuration loaded", {
    openAiModel: OPENAI_EMBEDDING_MODEL,
    pineconeIndex: PINECONE_INDEX,
    hasSecrets: !!OPENAI_API_KEY && !!PINECONE_API_KEY,
  });

  logger.info("Received Replicate webhook callback", { body: req.body });

  try {
    const payload = req.body as ReplicateWebhookPayload;

    // Validate webhook payload
    if (!payload.id) {
      logger.warn("Missing replicate ID in payload");
      res.status(400).json({ error: "Missing replicate ID in payload" });
      return;
    }

    // Send starting status if generation is starting
    if (payload.status === 'starting') {
      logger.info("Generation starting", { id: payload.id });
      res.status(200).json({
        message: "Generation starting",
        id: payload.id,
        status: 'starting'
      });
      return;
    }

    if (payload.status !== "succeeded") {
      logger.info("Generation status update", {
        status: payload.status,
        error: payload.error,
      });
      res.status(200).json({
        message: "Status update received",
        status: payload.status,
        error: payload.error,
      });
      return;
    }

    // Extract and validate the video URL
    let videoOutputUrl = "";
    if (Array.isArray(payload.output)) {
      videoOutputUrl = payload.output[0];
    } else if (typeof payload.output === "string") {
      videoOutputUrl = payload.output;
    } else {
      throw new Error("Invalid output format in webhook payload");
    }

    if (!videoOutputUrl.startsWith("https://")) {
      throw new Error("Invalid video URL format");
    }

    // Download and process the video
    const fileName = `${payload.id}.mp4`;
    logger.info("Downloading video", { url: videoOutputUrl });

    const videoResponse = await fetch(videoOutputUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.buffer();
    const fileSizeMB = videoBuffer.length / (1024 * 1024);

    if (fileSizeMB > 100) { // 100MB limit
      throw new Error(`Video file too large: ${fileSizeMB.toFixed(2)}MB`);
    }

    logger.info("Video downloaded", {
      size: videoBuffer.length,
      sizeMB: fileSizeMB.toFixed(2),
    });

    // Upload to Firebase Storage
    const file = bucket.file(`generated_videos/${fileName}`);
    await file.save(videoBuffer, {
      contentType: "video/mp4",
      resumable: false,
    });

    const videoUrl = `https://storage.googleapis.com/${bucket.name}/generated_videos/${fileName}`;
    logger.info("Video uploaded", { videoUrl });

    // Create video document
    const videoDoc = {
      id: fileName,
      description: payload.prompt,
      creatorId: "system",
      username: "System",
      avatarUrl: null,
      title: fileName.replace(".mp4", ""),
      stats: {
        comments: 0,
        dislikes: 0,
        likes: 0,
        superLikes: 0,
        tips: 0,
        views: 0,
      },
    };

    await db.collection("videos").doc(fileName).set(videoDoc);
    logger.info("Created video document", { videoId: fileName });

    // Update Pinecone index with the video's embedding
    if (!initializePinecone() || !index) {
      logger.error("Failed to initialize Pinecone");
    } else {
      try {
        // Generate embedding for the prompt
        const embedding = await getEmbeddingForText(payload.prompt);
        
        // Upsert the embedding to Pinecone
        await index.upsert([{
          id: fileName,
          values: embedding,
          metadata: {
            description: payload.prompt,
            isGenerated: true, // Mark as generated content
            timestamp: Date.now()
          },
        }]);
        
        logger.info("Updated Pinecone index", {
          vectorId: fileName,
          description: payload.prompt,
          embeddingLength: embedding.length
        });
      } catch (error) {
        logger.error("Failed to update Pinecone index", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't throw - we still want to return success for the video creation
      }
    }

    res.status(200).json({
      message: "Webhook processing complete",
      videoId: fileName,
      videoUrl,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in webhook processing:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: errorMessage });
  }
});

// Export the webhook endpoint as a Cloud Function
export const generationWebhook = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GiB",
    region: "us-central1",
    minInstances: 0,
    invoker: "public",
    secrets: [OPENAI_API_KEY, PINECONE_API_KEY],
  },
  app
);
