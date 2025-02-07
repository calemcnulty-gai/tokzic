import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';

/**
 * Uploads a video file to Firebase Storage
 * @param uri Local URI of the video file
 * @param filename Desired filename in storage
 * @returns Download URL of the uploaded video
 */
export const uploadVideo = async (uri: string, filename: string): Promise<string> => {
  const reference = storage().ref(`videos/${filename}`);
  
  // Handle different URI formats between platforms
  const videoUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
  
  // Upload the file
  await reference.putFile(videoUri);
  
  // Get download URL
  const downloadUrl = await reference.getDownloadURL();
  return downloadUrl;
};

/**
 * Gets the download URL for a video in storage
 * @param filename Name of the video file in storage
 * @returns Download URL of the video
 */
export const getVideoUrl = async (filename: string): Promise<string> => {
  const reference = storage().ref(`videos/${filename}`);
  return await reference.getDownloadURL();
}; 