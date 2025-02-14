import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import express, { Request, Response } from "express";
import cors from "cors";
import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "firebase-functions";

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

// Define configuration parameters
const PINECONE_API_KEY = defineSecret("PINECONE_API_KEY");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// Constants
const PINECONE_INDEX = "tokzic";
const VECTOR_DIM = 1536;

// Log configuration at startup
logger.info("Pinecone configuration loaded:", {
  index: PINECONE_INDEX,
});

// Initialize Pinecone client lazily
let pineconeClient: Pinecone | null = null;
let index: ReturnType<Pinecone["index"]> | null = null;

/**
 * Initializes the Pinecone client and index if not already initialized.
 * @return {boolean} True if initialization was successful, false otherwise.
 */
function initializePinecone(): boolean {
  const apiKey = PINECONE_API_KEY.value();
  if (!apiKey) {
    logger.error("Missing Pinecone API key");
    return false;
  }

  try {
    logger.info("Attempting to initialize Pinecone client with config:", {
      index: PINECONE_INDEX,
      hasApiKey: !!apiKey,
    });

    pineconeClient = new Pinecone({
      apiKey,
    });

    // Initialize the index
    index = pineconeClient.index(PINECONE_INDEX);

    logger.info("Successfully initialized Pinecone client", {
      indexName: PINECONE_INDEX,
      hasClient: !!pineconeClient,
      hasIndex: !!index,
    });
    return true;
  } catch (error) {
    logger.error("Failed to initialize Pinecone client:", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

// Basic health check endpoint
app.get("/", async (req: Request, res: Response) => {
  const pineconeStatus = initializePinecone();
  res.status(200).json({
    status: "healthy",
    pinecone: {
      initialized: pineconeStatus,
      apiKeyPresent: !!PINECONE_API_KEY.value(),
      indexName: PINECONE_INDEX,
      clientInitialized: !!pineconeClient,
      indexInitialized: !!index,
    },
    openai: {
      apiKeyPresent: !!OPENAI_API_KEY.value(),
    },
  });
});

/**
 * Helper function that adds a weighted vector to the target vector.
 * @param {number[]} target - The target vector to modify.
 * @param {number[]} vector - The source vector to add.
 * @param {number} weight - The weight to apply to the source vector.
 */
function weightedAdd(target: number[], vector: number[], weight: number): void {
  for (let i = 0; i < vector.length; i++) {
    target[i] += vector[i] * weight;
  }
}

// Define the recommendations endpoint - note the path is now "/"
app.post("/", async (req: Request, res: Response) => {
  logger.info("Received recommendation request", {
    body: req.body,
    query: req.query,
  });

  if (!PINECONE_API_KEY.value() || !initializePinecone()) {
    logger.error("Pinecone configuration error", {
      apiKeyPresent: !!PINECONE_API_KEY.value(),
      pineconeInitialized: !!pineconeClient,
    });
    res.status(500).json({
      error: "Pinecone is not configured correctly. Missing API key or initialization failed.",
    });
    return;
  }

  if (!index) {
    logger.error("Pinecone index not initialized");
    res.status(500).json({
      error: "Pinecone index not initialized.",
    });
    return;
  }

  try {
    // Extract userId from request body or query parameter
    const userId = req.body?.userId || req.query?.userId;
    logger.info("Processing request for user", { userId });

    if (!userId) {
      logger.warn("Missing userId in request");
      res.status(400).json({ error: "Missing userId parameter" });
      return;
    }

    // Query Firestore for all swipes by this user
    logger.info("Querying Firestore for user swipes", { userId });
    const swipesSnapshot = await db
      .collection("swipes")
      .where("userId", "==", userId)
      .get();

    if (swipesSnapshot.empty) {
      logger.warn("No swipes found for user", { userId });
      res.status(404).json({ message: "No swipes found for this user." });
      return;
    }

    logger.info("Found swipes for user", {
      userId,
      swipeCount: swipesSnapshot.size,
    });

    // Aggregate weights per video
    const videoWeights: { [videoId: string]: number } = {};
    swipesSnapshot.forEach((doc) => {
      const data = doc.data();
      const videoId = data.videoId;
      const direction = (data.direction || "").toLowerCase();
      if (!videoId || (direction !== "right" && direction !== "left")) {
        return;
      }
      const weight = direction === "right" ? 1 : -1;
      videoWeights[videoId] = (videoWeights[videoId] || 0) + weight;
    });

    logger.info("Processed swipes into weights", {
      uniqueVideoCount: Object.keys(videoWeights).length,
      weights: videoWeights,
    });

    const videoIds = Object.keys(videoWeights);
    if (videoIds.length === 0) {
      res.status(404).json({
        message: "No valid swipes found for this user.",
      });
      return;
    }

    // Fetch video embeddings from Pinecone
    logger.info("Fetching vectors from Pinecone", {
      videoCount: videoIds.length,
    });

    const fetchResponse = await index.fetch(videoIds);
    const records = fetchResponse.records;

    logger.info("Received Pinecone fetch response", {
      fetchedRecordsCount: records ? Object.keys(records).length : 0,
      hasRecords: !!records,
    });

    if (!records || Object.keys(records).length === 0) {
      res.status(500).json({
        message: "Failed to fetch video vectors from Pinecone.",
      });
      return;
    }

    // Compute aggregated user vector
    logger.info("Computing aggregated user vector");
    const userVector = new Array<number>(VECTOR_DIM).fill(0);
    let validCount = 0;
    for (const videoId of videoIds) {
      const record = records[videoId];
      if (record && record.values) {
        validCount++;
        weightedAdd(userVector, record.values, videoWeights[videoId]);
      }
    }

    logger.info("Computed user vector", {
      validVectorsProcessed: validCount,
      totalVectors: videoIds.length,
    });

    if (validCount === 0) {
      res.status(500).json({
        message: "No valid video embeddings found for user swipes.",
      });
      return;
    }

    // Query similar videos from Pinecone
    logger.info("Querying Pinecone for recommendations");
    const queryResponse = await index.query({
      vector: userVector,
      topK: 10,
      includeMetadata: true,
    });

    logger.info("Received recommendation results", {
      matchCount: queryResponse.matches?.length ?? 0,
    });

    // Trigger video generation in parallel
    const baseUrl = process.env.FIREBASE_FUNCTIONS_URL ||
                   `https://${process.env.GCLOUD_PROJECT}.cloudfunctions.net`;
    const generationUrl = `${baseUrl}/generation`;

    try {
      // Fire and forget - don't wait for the response
      fetch(generationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      }).catch(error => {
        logger.warn("Failed to trigger generation", { error });
        // Don't throw - this is non-critical
      });
    } catch (error) {
      logger.warn("Failed to trigger generation", { error });
      // Don't throw - this is non-critical
    }

    // Just return the IDs
    const recommendations = queryResponse.matches?.map((match) => match.id) || [];

    // Log the response we're about to send
    logger.info("Preparing response payload", {
      matchesLength: recommendations.length,
      firstMatchId: recommendations[0],
      responseSize: JSON.stringify(recommendations).length,
    });

    try {
      res.status(200).json({
        recommendations,
        debug: {
          processedSwipes: swipesSnapshot.size,
          validSwipes: validCount,
          userVectorNorm: Math.sqrt(
            userVector.reduce((sum, val) => sum + val * val, 0)
          ),
        },
      });
      logger.info("Response sent successfully");
    } catch (serializationError) {
      logger.error("Failed to serialize response:", {
        error: serializationError instanceof Error ? serializationError.message : "Unknown error",
        stack: serializationError instanceof Error ? serializationError.stack : undefined,
      });
      res.status(500).json({
        error: "Failed to serialize response",
        details: serializationError instanceof Error ? serializationError.message : "Unknown error",
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error in getRecommendations:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: errorMessage,
    });
  }
});

// Export the Express app as a Cloud Function with v2 configuration
export const getRecommendations = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GiB",
    region: "us-central1",
    minInstances: 0,
    invoker: "public",
    secrets: [PINECONE_API_KEY, OPENAI_API_KEY],
  },
  app
);
