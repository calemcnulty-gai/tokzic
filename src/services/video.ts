import { db, storage as storageInstance } from '../config/firebase';
import type { 
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { 
  collection,
  query,
  orderBy as firestoreOrderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  startAfter,
} from '@react-native-firebase/firestore';
import type { FirebaseStorageTypes } from '@react-native-firebase/storage';
import { 
  ref,
  getDownloadURL,
  list,
} from '@react-native-firebase/storage';
import { createLogger } from '../utils/logger';

const logger = createLogger('VideoService');

export interface VideoData {
  id: string;
  url: string;
  createdAt: number;
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
  async fetchVideos(limitCount: number, startAfterDoc?: FirebaseFirestoreTypes.QueryDocumentSnapshot): Promise<{
    videos: VideoWithMetadata[];
    lastVisible: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      logger.info('Fetching videos', { limit: limitCount, hasStartAfter: !!startAfterDoc });

      const videosRef = collection(db, 'videos');
      const queryConstraints = [
        firestoreOrderBy('createdAt', 'desc'),
        limit(limitCount)
      ];

      if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
      }

      const videoQuery = query(videosRef, ...queryConstraints);

      logger.info('Executing Firestore query', { 
        collection: 'videos',
        orderBy: 'createdAt',
        limit: limitCount,
        hasStartAfter: !!startAfterDoc 
      });

      const querySnapshot = await getDocs(videoQuery);
      logger.info('Got video documents', { 
        count: querySnapshot.docs.length,
        isEmpty: querySnapshot.empty,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          exists: doc.exists,
          data: doc.data()
        }))
      });

      const videos = await Promise.all(
        querySnapshot.docs.map(async (document) => {
          try {
            const video = document.data() as VideoData;
            logger.info('Processing video document', { 
              docId: document.id, 
              hasUrl: !!video.url,
              createdAt: video.createdAt,
              videoFields: Object.keys(video)
            });

            if (!video.url?.startsWith('https://firebasestorage.googleapis.com')) {
              logger.info('Fetching Firebase Storage URL', { videoId: document.id });
              try {
                const storageRef = ref(storageInstance, `videos/${document.id}`);
                video.url = await getDownloadURL(storageRef);
                logger.info('Got Firebase Storage URL', { 
                  videoId: document.id,
                  hasUrl: !!video.url,
                  url: video.url
                });
              } catch (urlError) {
                logger.error('Failed to get Firebase Storage URL', { 
                  videoId: document.id,
                  error: urlError
                });
                throw urlError;
              }
            }
            
            const metadata = await this.ensureVideoMetadata(document.id);
            return { video: { ...video, id: document.id }, metadata };
          } catch (error) {
            logger.error('Failed to process video document', {
              docId: document.id,
              error: error instanceof Error ? error.message : error
            });
            throw error;
          }
        })
      );

      return {
        videos,
        lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        hasMore: querySnapshot.docs.length === limitCount,
      };
    } catch (error) {
      logger.error('Failed to fetch videos', { 
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async fetchVideoById(videoId: string): Promise<VideoWithMetadata> {
    try {
      const videoDocRef = doc(db, 'videos', videoId);
      const videoDoc = await getDoc(videoDocRef);

      if (!videoDoc.exists) {
        throw new Error(`Video ${videoId} not found`);
      }

      const metadata = await this.ensureVideoMetadata(videoId);
      return {
        video: { id: videoId, ...videoDoc.data() } as VideoData,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to fetch video by id', { videoId, error });
      throw error;
    }
  }

  private async ensureVideoMetadata(videoId: string): Promise<VideoMetadata> {
    const metadataRef = doc(db, 'videoMetadata', videoId);
    
    try {
      logger.info('Checking video metadata', { videoId });
      const document = await getDoc(metadataRef);
      
      if (!document.exists) {
        logger.info('No existing metadata found, creating default', { videoId });
        const defaultMetadata: VideoMetadata = {
          id: videoId,
          creatorId: 'system',
          createdAt: Date.now(),
          stats: {
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: 0,
            tips: 0
          }
        };

        await setDoc(metadataRef, defaultMetadata);
        return defaultMetadata;
      }

      return document.data() as VideoMetadata;
    } catch (error) {
      logger.error('Failed to ensure video metadata', { 
        videoId, 
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async getStorageItems(startAfterToken?: string, reverse: boolean = false): Promise<FirebaseStorageTypes.Reference[]> {
    try {
      const storageRef = ref(storageInstance, 'videos');
      const options = startAfterToken ? 
        { maxResults: 1000, pageToken: startAfterToken } : 
        { maxResults: 1000 };

      const result = await list(storageRef, options);
      return reverse ? result.items.reverse() : result.items;
    } catch (error) {
      logger.error('Failed to get storage items', { 
        startAfter: startAfterToken,
        reverse,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async itemsToVideos(items: FirebaseStorageTypes.Reference[]): Promise<VideoData[]> {
    return Promise.all(
      items.map(async (item): Promise<VideoData> => {
        try {
          const url = await getDownloadURL(item);
          return {
            id: item.name,
            url,
            createdAt: Date.now()
          };
        } catch (error) {
          logger.error('Failed to convert storage item to video', { 
            itemName: item.name,
            error: error instanceof Error ? error.message : error
          });
          throw error;
        }
      })
    );
  }

  async fetchVideosAfter(limit = 1000, startAfterToken?: string): Promise<VideoWithMetadata[]> {
    try {
      const items = await this.getStorageItems(startAfterToken);
      const videos = await this.itemsToVideos(items);
      
      return Promise.all(
        videos.map(async (video) => ({
          video,
          metadata: await this.ensureVideoMetadata(video.id)
        }))
      );
    } catch (error) {
      logger.error('Failed to fetch videos after', { 
        limit,
        startAfter: startAfterToken,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async fetchVideosBefore(limit = 1000, startBefore?: string): Promise<VideoWithMetadata[]> {
    try {
      const items = await this.getStorageItems(startBefore, true);
      const videos = await this.itemsToVideos(items);
      
      return Promise.all(
        videos.map(async (video) => ({
          video,
          metadata: await this.ensureVideoMetadata(video.id)
        }))
      );
    } catch (error) {
      logger.error('Failed to fetch videos before', { 
        limit,
        startBefore,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async getVideoCount(): Promise<number> {
    try {
      const videosCollection = collection(db, 'videos');
      const snapshot = await getDocs(videosCollection);
      return snapshot.size;
    } catch (error) {
      logger.error('Failed to get video count', { 
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}

export const videoService = new VideoService(); 