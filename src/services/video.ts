import storage, { FirebaseStorageTypes } from '@react-native-firebase/storage';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { createLogger } from '../utils/logger';

const logger = createLogger('VideoService');

export interface VideoData {
  id: string;
  url: string;
  createdAt: number;
  // Add other video fields as needed
}

export interface VideoMetadata {
  id: string;
  creatorId: string;
  createdAt: number;
  stats: {
    views: number;
    likes: number;
    superLikes?: number;
    dislikes?: number;
    superDislikes?: number;
    comments?: number;
    tips?: number;
  };
}

export interface VideoWithMetadata {
  video: VideoData;
  metadata: VideoMetadata;
}

class VideoService {
  private db: FirebaseFirestoreTypes.Module;

  constructor() {
    this.db = firestore();
  }

  async fetchVideos(limit: number, startAfter?: FirebaseFirestoreTypes.QueryDocumentSnapshot): Promise<{
    videos: VideoWithMetadata[];
    lastVisible: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      logger.info('Fetching videos', { limit, hasStartAfter: !!startAfter });

      let query = this.db
        .collection('videos')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      logger.info('Executing Firestore query', { 
        collection: 'videos',
        orderBy: 'createdAt',
        limit,
        hasStartAfter: !!startAfter 
      });

      const querySnapshot = await query.get();
      logger.info('Got video documents', { 
        count: querySnapshot.docs.length,
        isEmpty: querySnapshot.empty,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          exists: doc.exists,
          data: doc.data(),
          rawData: JSON.stringify(doc.data())
        }))
      });

      const videos = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          try {
            const video = doc.data() as VideoData;
            logger.info('Processing video document', { 
              docId: doc.id, 
              hasUrl: !!video.url,
              createdAt: video.createdAt,
              rawVideo: JSON.stringify(video),
              videoFields: Object.keys(video)
            });

            // Get Firebase Storage URL if not present
            if (!video.url?.startsWith('https://firebasestorage.googleapis.com')) {
              logger.info('Fetching Firebase Storage URL', { videoId: doc.id });
              try {
                const storageRef = storage().ref(`videos/${doc.id}`);
                video.url = await storageRef.getDownloadURL();
                logger.info('Got Firebase Storage URL', { 
                  videoId: doc.id,
                  hasUrl: !!video.url,
                  url: video.url
                });
              } catch (urlError) {
                logger.error('Failed to get Firebase Storage URL', { 
                  videoId: doc.id,
                  error: urlError
                });
                throw urlError;
              }
            }
            
            const metadata = await ensureVideoMetadata(doc.id);
            logger.info('Got video metadata', { 
              docId: doc.id,
              metadata: JSON.stringify(metadata)
            });

            return {
              video: { ...video, id: doc.id },
              metadata,
            };
          } catch (error) {
            logger.error('Error processing video document', { 
              docId: doc.id, 
              error: error instanceof Error ? {
                message: error.message,
                name: error.name,
                stack: error.stack
              } : error
            });
            throw error;
          }
        })
      );

      logger.info('Processed all videos', {
        totalVideos: videos.length,
        videoIds: videos.map(v => v.video.id),
        hasUrls: videos.every(v => !!v.video.url)
      });

      return {
        videos,
        lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        hasMore: querySnapshot.docs.length === limit,
      };
    } catch (error) {
      logger.error('Failed to fetch videos', { 
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error 
      });
      throw error;
    }
  }

  async fetchVideoById(videoId: string): Promise<VideoWithMetadata> {
    try {
      const videoDoc = await this.db
        .collection('videos')
        .doc(videoId)
        .get();

      if (!videoDoc.exists) {
        throw new Error(`Video ${videoId} not found`);
      }

      const metadata = await ensureVideoMetadata(videoId);

      return {
        video: { id: videoId, ...videoDoc.data() } as VideoData,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to fetch video by id', { videoId, error });
      throw error;
    }
  }
}

export const videoService = new VideoService();

/**
 * Creates default metadata for a video if it doesn't exist
 */
async function ensureVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const db = firestore();
  const metadataRef = db.collection('videoMetadata').doc(videoId);
  
  try {
    logger.info('Checking video metadata', { videoId });
    const doc = await metadataRef.get();
    
    if (!doc.exists) {
      logger.info('No existing metadata found, creating default', { videoId });
      const defaultMetadata: VideoMetadata = {
        id: videoId,
        creatorId: 'system', // Default creator ID
        createdAt: Date.now(),
        stats: {
          views: 0,
          likes: 0,
          dislikes: 0,
          comments: 0,
          tips: 0
        }
      };
      
      logger.info('Setting default metadata', { 
        videoId, 
        metadata: JSON.stringify(defaultMetadata)
      });
      await metadataRef.set(defaultMetadata);
      logger.info('Successfully created default metadata', { videoId });
      return defaultMetadata;
    }
    
    const metadata = { id: videoId, ...doc.data() } as VideoMetadata;
    logger.info('Found existing metadata', { 
      videoId, 
      metadata: JSON.stringify(metadata),
      rawData: JSON.stringify(doc.data()),
      fields: Object.keys(metadata)
    });
    return metadata;
  } catch (error) {
    logger.error('Error ensuring video metadata', { 
      videoId, 
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error 
    });
    throw error;
  }
}

/**
 * Gets all video items from storage, optionally filtered by a start point
 * @param startAfter Optional video ID to start after
 * @param reverse Whether to reverse the order of items
 * @returns Array of storage items
 */
async function getStorageItems(startAfter?: string, reverse: boolean = false): Promise<FirebaseStorageTypes.Reference[]> {
  const reference = storage().ref('videos');
  const result = await reference.list();
  let items = result.items;

  // Sort items by name for consistent ordering
  items.sort((a, b) => {
    if (reverse) {
      return b.name.localeCompare(a.name);
    }
    return a.name.localeCompare(b.name);
  });

  if (startAfter) {
    const startIndex = items.findIndex(item => item.name === `videos/${startAfter}`);
    if (startIndex !== -1) {
      items = reverse ? items.slice(0, startIndex) : items.slice(startIndex + 1);
    }
  }

  return items;
}

/**
 * Converts storage items to Video objects
 * @param items Array of storage items to convert
 * @returns Array of Video objects with download URLs
 */
async function itemsToVideos(items: FirebaseStorageTypes.Reference[]): Promise<VideoData[]> {
  const videoPromises = items.map(async (item) => {
    try {
      const name = item.name.replace('videos/', '');
      logger.info('Getting Firebase Storage URL for video', { name, path: item.fullPath });
      const url = await item.getDownloadURL();
      
      if (!url?.startsWith('https://firebasestorage.googleapis.com')) {
        throw new Error(`Invalid Firebase Storage URL returned for video ${name}`);
      }
      
      logger.info('Got valid Firebase Storage URL', { 
        name,
        hasValidUrl: true,
        path: item.fullPath,
        bucket: item.bucket
      });
      
      return {
        id: name,
        url,
        createdAt: Date.now(), // We get this from Firestore metadata later
      };
    } catch (error) {
      logger.error('Error getting Firebase Storage URL', { 
        name: item.name, 
        path: item.fullPath,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      throw error;
    }
  });

  const videos = await Promise.all(videoPromises);
  
  // Validate all videos have valid Firebase Storage URLs
  const invalidVideos = videos.filter(v => !v.url?.startsWith('https://firebasestorage.googleapis.com'));
  if (invalidVideos.length > 0) {
    logger.error('Some videos have invalid Firebase Storage URLs', {
      invalidVideoIds: invalidVideos.map(v => v.id)
    });
    throw new Error('Some videos have invalid Firebase Storage URLs');
  }

  return videos;
}

/**
 * Fetches videos after a specific video ID
 * @param limit Number of videos to fetch
 * @param startAfter ID of the video to start after
 * @returns Array of videos with download URLs
 */
export async function fetchVideosAfter(limit = 1000, startAfter?: string): Promise<VideoWithMetadata[]> {
  try {
    logger.info('Fetching videos after', { limit, startAfter });
    const items = await getStorageItems(startAfter, false);
    const limitedItems = items.slice(0, limit);
    const videos = await itemsToVideos(limitedItems);
    
    // Fetch metadata for each video
    const videosWithMetadata = await Promise.all(
      videos.map(async (video) => {
        const metadata = await ensureVideoMetadata(video.id);
        return { video, metadata };
      })
    );
    
    logger.info('Returning videos after', {
      count: videosWithMetadata.length,
      startAfter: startAfter || 'start',
      videoIds: videosWithMetadata.map(v => v.video.id)
    });
    return videosWithMetadata;
  } catch (error) {
    logger.error('Error fetching videos after', { startAfter, error });
    throw error;
  }
}

/**
 * Fetches videos before a specific video ID
 * @param limit Number of videos to fetch
 * @param startBefore ID of the video to start before
 * @returns Array of videos with download URLs
 */
export async function fetchVideosBefore(limit = 1000, startBefore?: string): Promise<VideoWithMetadata[]> {
  try {
    logger.info('Fetching videos before', { limit, startBefore });
    const items = await getStorageItems(startBefore, true);
    const limitedItems = items.slice(0, limit);
    const videos = await itemsToVideos(limitedItems);
    
    // Fetch metadata for each video
    const videosWithMetadata = await Promise.all(
      videos.map(async (video) => {
        const metadata = await ensureVideoMetadata(video.id);
        return { video, metadata };
      })
    );
    
    logger.info('Returning videos before', {
      count: videosWithMetadata.length,
      startBefore: startBefore || 'end',
      videoIds: videosWithMetadata.map(v => v.video.id)
    });
    return videosWithMetadata;
  } catch (error) {
    logger.error('Error fetching videos before', { startBefore, error });
    throw error;
  }
}

/**
 * Gets the total count of videos in storage
 * @returns Total number of videos
 */
export async function getVideoCount(): Promise<number> {
  try {
    const reference = storage().ref('videos');
    const result = await reference.list();
    return result.items.length;
  } catch (error) {
    logger.error('Error getting video count', { error });
    throw error;
  }
}

// Keep the original fetchVideos for backward compatibility
export const fetchVideos = fetchVideosAfter; 