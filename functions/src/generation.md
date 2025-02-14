# AI-Powered Video Generation Documentation

This document provides an overview and detailed explanation for two Cloud Functions that power our AI-driven video generation demo:

1. **Pre-Prompt Generation Endpoint (`functions/src/generation.ts`)**
2. **Webhook & Post-Processing Endpoint (`functions/src/generationWebhook.ts`)**

The system leverages user swipe data, video metadata stored in Firestore, and AI services (OpenAI & Replicate) to create personalized, cinematic vertical videos. It is designed for demo purposes to showcase advanced AI integration while keeping code modular and maintainable.

---

## Overview

### Operation Flow

1. **User Interaction & Swipe Data Collection:**
   - Users swipe right (like) or left (dislike) on videos.
   - Each swipe is stored in Firestore as a document (with fields such as `videoId`, `direction`, `userId`, etc.).

2. **Pre-Prompt Generation:**
   - The pre-prompt endpoint (`generation.ts`) is triggered by an HTTP request containing the user ID.
   - It queries Firestore for the swipes specific to that user.
   - It then fetches related video details (specifically, the `description` field) directly from the Firestore "videos" collection.
   - The function segregates descriptions from liked and disliked videos and sends these as input to the OpenAI API, which generates a natural language prompt describing a vertical video tailored to the user's preferences.
   - Using the generated prompt, it makes a request to Replicate's API (luma/ray model) to trigger video generation, passing a webhook URL as part of the request.
   - Finally, it stores a pending document in Firestore (under `pending_generated_videos`) keyed by the Replicate prediction ID for later reconciliation.

3. **Webhook Callback & Post-Processing:**
   - Once the Replicate API completes the video generation, it calls back our webhook endpoint (`generationWebhook.ts`).
   - This endpoint:
     - Retrieves the corresponding pending generation document.
     - Downloads the generated video, ensuring the file name adheres to the `.mp4` extension standard.
     - Uploads the video to Firebase Storage.
     - Writes a new document into Firestore (in the `generated_videos` collection) containing metadata including the prompt used for generation.
     - Upserts the new video into a Pinecone vector index for future recommendations.
   - Finally, it triggers client updates (for example, via Firestore's real-time updates or a Redux push) so that the newly generated video is seamlessly appended to the user's feed.

---

## Detailed Description

### 1. Pre-Prompt Generation Endpoint (`functions/src/generation.ts`)

#### Purpose
- **Gather User Data:** Pulls swipe documents from Firestore.
- **Fetch Video Descriptions:** Retrieves video metadata (specifically, the video description) directly from the "videos" collection.
- **Aggregate Liked/Disliked Data:** Separates descriptions into `liked` and `disliked` arrays based on user's swipe direction.
- **Generate a Natural Language Prompt:** Invokes OpenAI's Chat API (GPT-3.5-turbo) to synthesize a concise, engaging paragraph that describes the type of vertical video the user is likely to appreciate.
- **Initiate Video Generation:** Calls the Replicate API with the generated prompt, including a dynamically-built webhook URL reserved for post-processing.
- **Record Pending Generation:** Stores a record in Firestore (`pending_generated_videos`) keyed by the Replicate prediction ID, so that when the video is ready, the system can correlate the response.

#### Key Design Choices
- **Direct Firestore Access for Descriptions:**  
  Avoids an extra dependency on Pinecone for fetching descriptions by accessing the already indexed "videos" collection.
- **LLM-based Prompt Synthesis:**  
  Utilizes a state-of-the-art LLM to produce a creative, natural language prompt instead of a simple concatenation or heuristic-based approach.
- **Asynchronous and Serverless:**  
  The function is optimized to trigger long-running tasks (like calling Replicate) and then return immediately, delegating video processing and final updates to the webhook endpoint.

#### Usage
- **Endpoint URL:**  
  This function is deployed as an HTTP endpoint via Firebase Functions. Clients (or orchestrating services) trigger it by sending a POST request with the `userId`.
- **Secrets and Environment Variables:**  
  It relies on cloud secrets for the OpenAI and Replicate API keys. The environment variable `FIREBASE_FUNCTIONS_URL` must be configured for dynamic webhook URL generation.

---

### 2. Webhook & Post-Processing Endpoint (`functions/src/generationWebhook.ts`)

#### Purpose
- **Handle Replicate Callbacks:**  
  Receives webhook events from the Replicate API once the video generation completes.
- **Process the Generated Video:**  
  Downloads the video from Replicate, enforces a consistent `.mp4` filename, and uploads it to Firebase Storage.
- **Persist Metadata:**  
  Inserts a new document into the Firestore `generated_videos` collection, ensuring the original prompt is saved and associated with the video.
- **Upsert to Pinecone:**  
  Generates an embedding (using the established text-embedding model) for the generated prompt and upserts the new video information to the Pinecone index.
- **Trigger Feed Updates:**  
  The update to Firestore can be monitored by the client's Redux listener in real time so that the new video is appended to the user's feed.

#### Key Design Choices
- **Separation of Concerns:**  
  Dividing the generation flow into pre- and post-processing endpoints keeps code modular and isolates long-running operations (video generation) from immediate responses.
- **Webhook Mechanism:**  
  Leverages Replicate's webhook capabilities to handle asynchronous tasks and ensure that processing continues reliably after the initial call.
- **Consistent File Naming:**  
  Enforces a `.mp4` extension for the generated video to ensure compatibility across Firebase Storage, Pinecone, and the client application.
- **Robust Logging:**  
  Comprehensive logging is integrated to provide traceability, error tracking, and performance monitoring via Google Cloud Console.

#### Usage
- **Endpoint URL:**  
  This function is deployed as an HTTP endpoint. Replicate sends its callback to this endpoint after video generation.
- **Data Flow:**  
  On receiving the callback, the function cross-references the pending generation record, downloads and stores the video, updates Firestore, and communicates the new video ID to the client update system (e.g., Redux real-time feed update).

---

## Motivation and Design Considerations

- **Demo-First Prioritization:**  
  The system is designed to quickly demonstrate the potential of AI-driven personalization and dynamic video generation. It favors rapid development and ease of integration over long-term production concerns.
  
- **Modularity and Maintainability:**  
  Each function is a self-contained module with a clear responsibility:
  - **Pre-Prompt Function:** Data retrieval, prompt synthesis, and triggering video generation.
  - **Webhook Function:** Asynchronous post-processing, storage management, and client updates.
  
- **AI Integration:**  
  The use of OpenAI for prompt generation and the Replicate API for video generation showcases cutting-edge AI functionality. By integrating these services, the system offers advanced AI capabilities in an easily inspectable codebase.
  
- **Asynchronous Processing:**  
  Recognizing that operations like video generation can be time-consuming, the design embraces asynchronous flows. The generation endpoint quickly passes control to the webhook for lengthy tasks, ensuring a responsive system.
  
- **Transparency in Metadata:**  
  Storing the original prompt, generated video URL, and associated metadata in Firestore provides transparency and traceability. This facilitates debugging, analytics, and future improvements to recommendation performance.

---

## End-to-End Operation Summary

1. **User Trigger:**  
   A client sends a POST request (with `userId`) to the pre-prompt endpoint.
2. **Data Aggregation:**  
   - Firestore is queried for user swipes.
   - Video descriptions are fetched from the "videos" collection.
3. **Prompt Generation:**  
   The system segregates liked/disliked descriptions and calls the OpenAI API to produce a natural language prompt.
4. **Initiating Video Generation:**  
   The prompt is sent to the Replicate API along with a webhook URL.
5. **Pending Document Creation:**  
   A pending generation entry is saved in Firestore for tracking.
6. **Replicate Callback:**  
   Replicate calls the webhook endpoint once video processing is complete.
7. **Post-Processing:**  
   - The generated video is downloaded, renamed to include `.mp4`, and uploaded to Firebase Storage.
   - A new document is created in the `generated_videos` collection in Firestore.
   - The video is upserted into the Pinecone index.
   - Client applications are updated (via Redux or real-time notifications) to include the new video.

---

## Conclusion

This documentation details the architecture, design, and operational flow for the AI-powered video generation functions. By combining serverless Cloud Functions, modern AI services, and robust data infrastructure, the system delivers an impressive demo that highlights personalized video content creation driven by user preferences. The modular design, clear separation of concerns, and thorough logging make the code both maintainable and easy to extend.

For further modifications, testing, or integration, this document serves as a guide for understanding each component's role in the overall pipeline.
