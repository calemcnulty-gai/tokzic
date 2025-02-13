#!/usr/bin/env node

/**
 * Quick script to test video generation through the Replicate API for the luma/ray model.
 *
 * This script:
 *  - Reads two Replicate API keys from environment variables (REPLICATE_API_KEY and REPLICATE_API_KEY_2)
 *  - Randomly selects one key from the available keys.
 *  - Sends a prediction request using the supplied key to the Replicate API.
 *  - Polls for the prediction result until it succeeds or fails.
 *
 * Requirements:
 *  - Node.js (v18+ is recommended; if using an earlier version, ensure "node-fetch" is installed)
 *  - Environment variables:
 *      REPLICATE_API_KEY         (your first API key)
 *      REPLICATE_API_KEY_2       (your second API key; optional)
 *      REPLICATE_MODEL_VERSION   (the version ID of the "luma/ray" model on Replicate)
 *
 * Adjust the "input" parameters (like "prompt", "num_frames", "fps", etc.) as needed for the model.
 */

// If using Node 18+ with global fetch available, this code will use it; otherwise, it'll require 'node-fetch'.
let fetchFn;
if (typeof fetch === "function") {
  fetchFn = fetch;
} else {
  try {
    fetchFn = require('node-fetch');
  } catch (error) {
    console.error("Fetch API is not available and 'node-fetch' is not installed.");
    process.exit(1);
  }
}

// Retrieve the model version from env. Exit if not provided.
const MODEL_VERSION = process.env.REPLICATE_MODEL_VERSION || "PUT_YOUR_MODEL_VERSION_HERE";
if (MODEL_VERSION === "PUT_YOUR_MODEL_VERSION_HERE") {
  console.error("Error: REPLICATE_MODEL_VERSION environment variable is not set to a valid model version.");
  process.exit(1);
}

// Helper function to sleep for a given number of milliseconds
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Poll the prediction endpoint until the status is "succeeded" or "failed"
async function pollPrediction(getUrl, headers) {
  while (true) {
    console.log("Polling prediction status from:", getUrl);
    const res = await fetchFn(getUrl, { headers });
    if (!res.ok) {
      console.error("Error polling prediction:", res.status, await res.text());
      process.exit(1);
    }
    const data = await res.json();
    console.log("Current status:", data.status);
    if (data.status === "succeeded" || data.status === "failed") {
      return data;
    }
    await sleep(3000); // Poll every 3 seconds
  }
}

async function testReplicateVideo() {
  // Obtain API keys from environment variables.
  const key1 = process.env.REPLICATE_API_KEY;
  const key2 = process.env.REPLICATE_API_KEY_2;
  const keys = [key1, key2].filter(Boolean);
  if (keys.length === 0) {
    console.error("No Replicate API keys found in environment variables.");
    process.exit(1);
  }

  // Randomly select one key from the available keys.
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];
  console.log("Using Replicate API key (truncated):", selectedKey.substring(0, 10) + "...");
  const headers = {
    "Authorization": `Token ${selectedKey}`,
    "Content-Type": "application/json"
  };

  // Define the payload for the prediction request.
  const payload = {
    version: MODEL_VERSION,
    input: {
      prompt: "A futuristic cityscape under a starry sky",
      num_frames: 16,
      fps: 8,
      width: 512,
      height: 512
    }
  };

  console.log("Sending prediction request to Replicate...");
  const response = await fetchFn("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Error response from Replicate:", response.status, errText);
    process.exit(1);
  }
  
  const prediction = await response.json();
  console.log("Full prediction response:", JSON.stringify(prediction, null, 2));

  if (prediction.error) {
    console.error("Error in prediction request:", prediction.error);
    process.exit(1);
  }
  
  if (!prediction.id || !prediction.urls || !prediction.urls.get) {
    console.error("Prediction response is missing required fields (id or urls.get).");
    process.exit(1);
  }

  console.log("Prediction created. ID:", prediction.id);
  console.log("Polling prediction status...");
  
  // Poll for the prediction result until it completes.
  const result = await pollPrediction(prediction.urls.get, headers);
  if (result.status === "succeeded") {
    console.log("Prediction succeeded!");
    console.log("Output:", result.output);
  } else {
    console.error("Prediction failed:", result.error);
  }
}

testReplicateVideo().catch(err => {
  console.error("An error occurred:", err);
  process.exit(1);
});