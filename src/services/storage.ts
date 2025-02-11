import { storage } from '../config/firebase';
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
  const reference = storage.ref(`videos/${filename}`);
  await reference.put(data);
  return reference.getDownloadURL();
};

/**
 * Deletes a video file from Firebase Storage
 * @param filename Name of the video file in storage
 */
export const deleteVideo = async (filename: string): Promise<void> => {
  const reference = storage.ref(`videos/${filename}`);
  await reference.delete();
};

/**
 * Gets the download URL for a video in storage
 * @param filename Name of the video file in storage
 * @returns Download URL of the video
 */
export const getVideoUrl = async (filename: string): Promise<string> => {
  const reference = storage.ref(`videos/${filename}`);
  return reference.getDownloadURL();
}; 