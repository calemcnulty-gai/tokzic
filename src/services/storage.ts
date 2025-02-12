import { store } from '../store';
import { createLogger } from '../utils/logger';

const logger = createLogger('StorageService');

/**
 * Uploads a video file to Firebase Storage
 * @param filename Name of the video file in storage
 * @param data Blob, Uint8Array, or ArrayBuffer of the video file
 * @returns Download URL of the uploaded video
 */
export const uploadVideo = async (
  filename: string,
  data: Blob | Uint8Array | ArrayBuffer
): Promise<string> => {
  const state = store.getState();
  const { storageService } = state.firebase;

  if (!storageService) {
    throw new Error('Storage service not initialized');
  }

  return storageService.uploadVideo(filename, data);
};

/**
 * Deletes a video file from Firebase Storage
 * @param filename Name of the video file in storage
 */
export const deleteVideo = async (filename: string): Promise<void> => {
  const state = store.getState();
  const { storageService } = state.firebase;

  if (!storageService) {
    throw new Error('Storage service not initialized');
  }

  return storageService.deleteVideo(filename);
};

/**
 * Gets the download URL for a video in storage
 * @param filename Name of the video file in storage
 * @returns Download URL of the video
 */
export const getVideoUrl = async (filename: string): Promise<string> => {
  const state = store.getState();
  const { storageService } = state.firebase;

  if (!storageService) {
    throw new Error('Storage service not initialized');
  }

  return storageService.getVideoUrl(filename);
}; 