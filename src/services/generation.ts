import { createLogger } from '../utils/logger';
import { onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import type { AppDispatch } from '../store/types';
import { handleGeneratedVideo, addPendingGeneration, removePendingGeneration } from '../store/slices/videoSlice';

const logger = createLogger('GenerationService');

interface GenerationWebhookPayload {
  id: string;
  status: string;
  output: string | string[];
  error?: string;
  prompt: string;
}

// Function to get store at runtime to avoid circular dependencies
let dispatch: AppDispatch | null = null;
export const initializeGenerationService = (storeDispatch: AppDispatch) => {
  dispatch = storeDispatch;
};

class GenerationService {
  private unsubscribe: (() => void) | null = null;

  private getDb() {
    return serviceManager.getFirestoreService()['db'];
  }

  private getDispatch() {
    if (!dispatch) {
      throw new Error('Generation service not initialized with dispatch');
    }
    return dispatch;
  }

  /**
   * Subscribe to newly generated videos in Firestore
   */
  subscribeToGeneratedVideos(): void {
    try {
      const db = this.getDb();
      const subscriptionTimestamp = Date.now();
      const videosQuery = query(
        collection(db, 'videos'),
        where('createdAt', '>', subscriptionTimestamp),
        orderBy('createdAt', 'desc')
      );

      logger.info('Subscribing to generated videos', {
        collection: 'videos',
        filter: `createdAt > ${subscriptionTimestamp}`,
        orderBy: 'createdAt desc'
      });
      
      this.unsubscribe = onSnapshot(videosQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const videoId = change.doc.id;
            const data = change.doc.data();
            logger.info('New generated video detected', { 
              videoId,
              data: {
                createdAt: data.createdAt,
                hasUrl: !!data.url,
                hasDescription: !!data.description
              }
            });
            this.getDispatch()(handleGeneratedVideo(videoId));
          }
        });
      }, (error) => {
        logger.error('Error in generated videos subscription', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error
        });
      });
    } catch (error) {
      logger.error('Error setting up generated videos subscription', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
    }
  }

  /**
   * Unsubscribe from generated videos updates
   */
  unsubscribeFromGeneratedVideos() {
    if (this.unsubscribe) {
      logger.info('Unsubscribing from generated videos');
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Handles the webhook response from the generation service
   */
  async handleWebhookResponse(payload: GenerationWebhookPayload): Promise<void> {
    logger.info('Received generation webhook', { 
      id: payload.id,
      status: payload.status,
      hasError: !!payload.error
    });

    if (!payload.id) {
      logger.error('Missing generation ID in payload');
      return;
    }

    if (payload.status === 'starting') {
      logger.info('Generation starting', { id: payload.id });
      this.getDispatch()(addPendingGeneration(payload.id));
      return;
    }

    if (payload.status !== 'succeeded') {
      logger.warn('Generation not successful', { 
        id: payload.id,
        status: payload.status,
        error: payload.error
      });
      if (payload.status === 'failed' || payload.status === 'canceled') {
        this.getDispatch()(removePendingGeneration(payload.id));
      }
      return;
    }

    try {
      // Handle the successful generation
      logger.info('Generation succeeded, handling video', { id: payload.id });
      await this.getDispatch()(handleGeneratedVideo(payload.id));
      this.getDispatch()(removePendingGeneration(payload.id));
      logger.info('Successfully handled generated video', { id: payload.id });
    } catch (error) {
      logger.error('Failed to handle generated video', { 
        id: payload.id,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
      this.getDispatch()(removePendingGeneration(payload.id));
    }
  }
}

export const generationService = new GenerationService(); 