import { createLogger } from '../utils/logger';
import type { VideoData, VideoWithMetadata } from '../types/video';
import type { VideoMetadata } from '../types/firestore';
import type { QueryDocumentSnapshot, DocumentData, QueryConstraint } from 'firebase/firestore';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { collection, query, limit, startAfter, getDocs, doc, getDoc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const logger = createLogger('VideoService');

const VIDEOS_COLLECTION = 'videos';

class VideoService {
  private getFirebaseServices() {
    const firestoreService = serviceManager.getFirestoreService();
    const storageService = serviceManager.getStorageService();
    return { firestoreService, storageService };
  }

  async fetchVideos(
    limitCount: number,
    lastDoc?: QueryDocumentSnapshot<DocumentData, DocumentData>
  ): Promise<{
    videos: VideoWithMetadata[];
    lastVisible: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    logger.info('Fetching videos', { 
      limit: limitCount, 
      hasStartAfter: !!lastDoc,
      startAfterId: lastDoc?.id
    });

    try {
      const { firestoreService } = this.getFirebaseServices();
      const db = firestoreService['db'];
      const videosRef = collection(db, VIDEOS_COLLECTION);
      
      const constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const queryRef = query(videosRef, ...constraints);
      const snapshot = await getDocs(queryRef);
      const videos: VideoWithMetadata[] = [];

      logger.debug('Processing video documents', {
        snapshotSize: snapshot.size,
        docs: snapshot.docs.map(doc => ({
          id: doc.id,
          exists: doc.exists(),
          dataFields: Object.keys(doc.data())
        }))
      });

      for (const doc of snapshot.docs) {
        const data = doc.data();
        logger.debug('Processing individual video document', {
          docId: doc.id,
          rawData: data,
          hasStoragePath: !!data.storagePath,
          storagePath: data.storagePath,
          metadata: data.metadata
        });

        try {
          const { storageService } = this.getFirebaseServices();
          const storage = storageService['storage'];
          const storagePath = data.storagePath || `videos/${doc.id}`;
          const videoRef = ref(storage, storagePath);
          
          logger.debug('Fetching video URL', {
            docId: doc.id,
            storagePath,
            refFullPath: videoRef.fullPath
          });

          const url = await getDownloadURL(videoRef);
          
          logger.debug('Got video URL', {
            docId: doc.id,
            url,
            hasUrl: !!url
          });

          videos.push({
            video: {
              id: doc.id,
              url,
              createdAt: data.createdAt || Date.now(),
            },
            metadata: data.metadata || {},
          });
        } catch (error) {
          logger.error('Error processing video document', {
            docId: doc.id,
            error: error instanceof Error ? {
              message: error.message,
              name: error.name,
              stack: error.stack
            } : error
          });
          // Continue processing other videos even if one fails
          continue;
        }
      }

      const result = {
        videos,
        lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount,
      };

      logger.info('Got video documents', {
        count: videos.length,
        hasLastVisible: !!result.lastVisible,
        lastVisibleId: result.lastVisible?.id,
        hasMore: result.hasMore,
        videoSummary: videos.map(v => ({
          id: v.video.id,
          hasUrl: !!v.video.url,
          metadataFields: Object.keys(v.metadata)
        }))
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch videos', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error,
        limit: limitCount,
        hasStartAfter: !!lastDoc
      });
      throw error;
    }
  }

  async fetchVideoById(videoId: string): Promise<VideoWithMetadata> {
    const { firestoreService } = this.getFirebaseServices();
    const db = firestoreService['db'];

    try {
      const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error(`Video ${videoId} not found`);
      }

      const data = videoDoc.data();
      return {
        video: {
          id: videoDoc.id,
          url: data.url,
          createdAt: data.createdAt
        },
        metadata: data.metadata
      } as VideoWithMetadata;
    } catch (error) {
      logger.error('Failed to fetch video by id', { videoId, error });
      throw error;
    }
  }

  async fetchVideosAfter(pageSize = 1000, startAfterToken?: string): Promise<VideoWithMetadata[]> {
    const { firestoreService } = this.getFirebaseServices();
    const db = firestoreService['db'];

    try {
      const videosRef = collection(db, VIDEOS_COLLECTION);
      const videosQuery = startAfterToken
        ? query(videosRef, limit(pageSize), startAfter(doc(db, VIDEOS_COLLECTION, startAfterToken)))
        : query(videosRef, limit(pageSize));

      const snapshot = await getDocs(videosQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          video: {
            id: doc.id,
            url: data.url,
            createdAt: data.createdAt
          },
          metadata: data.metadata
        } as VideoWithMetadata;
      });
    } catch (error) {
      logger.error('Failed to fetch videos after', { 
        pageSize,
        startAfter: startAfterToken,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async fetchVideosBefore(pageSize = 1000, startBefore?: string): Promise<VideoWithMetadata[]> {
    const { firestoreService } = this.getFirebaseServices();
    const db = firestoreService['db'];

    try {
      const videosRef = collection(db, VIDEOS_COLLECTION);
      const videosQuery = startBefore
        ? query(videosRef, limit(pageSize), startAfter(doc(db, VIDEOS_COLLECTION, startBefore)))
        : query(videosRef, limit(pageSize));

      const snapshot = await getDocs(videosQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          video: {
            id: doc.id,
            url: data.url,
            createdAt: data.createdAt
          },
          metadata: data.metadata
        } as VideoWithMetadata;
      });
    } catch (error) {
      logger.error('Failed to fetch videos before', { 
        pageSize,
        startBefore,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async getVideoCount(): Promise<number> {
    const { firestoreService } = this.getFirebaseServices();
    const db = firestoreService['db'];

    try {
      const videosRef = collection(db, VIDEOS_COLLECTION);
      const snapshot = await getDocs(videosRef);
      return snapshot.size;
    } catch (error) {
      logger.error('Failed to get video count', { 
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Uploads a video file to Firebase Storage
   */
  async uploadVideo(
    file: Blob | Uint8Array | ArrayBuffer,
    metadata?: { contentType?: string },
    onProgress?: (progress: number) => void
  ): Promise<VideoData> {
    const { firestoreService, storageService } = this.getFirebaseServices();
    const db = firestoreService['db'];
    const storage = storageService['storage'];
    
    try {
      const videoId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const videoRef = ref(storage, `videos/${videoId}`);
      
      await uploadBytes(videoRef, file, metadata);
      const url = await getDownloadURL(videoRef);

      const videoData: VideoData = {
        id: videoId,
        url,
        createdAt: Date.now()
      };

      await setDoc(doc(db, VIDEOS_COLLECTION, videoId), videoData);

      logger.info('Video upload completed', { videoId, url });
      return videoData;
    } catch (error) {
      logger.error('Failed to upload video', { 
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Deletes a video and its metadata
   */
  async deleteVideo(videoId: string): Promise<void> {
    const { firestoreService, storageService } = this.getFirebaseServices();
    const db = firestoreService['db'];
    const storage = storageService['storage'];
    
    try {
      const videoRef = ref(storage, `videos/${videoId}`);
      await deleteObject(videoRef);
      await deleteDoc(doc(db, VIDEOS_COLLECTION, videoId));
      
      logger.info('Video deleted successfully', { videoId });
    } catch (error) {
      logger.error('Failed to delete video', { videoId, error });
      throw error;
    }
  }
}

export const videoService = new VideoService(); 