import { store } from '../store';
import { handleGeneratedVideo, addPendingGeneration, removePendingGeneration } from '../store/slices/videoSlice';
import { createLogger } from '../utils/logger';

const logger = createLogger('GenerationService');

interface GenerationWebhookPayload {
  id: string;
  status: string;
  output: string | string[];
  error?: string;
  prompt: string;
}

class GenerationService {
  /**
   * Handles the webhook response from the generation service
   */
  async handleWebhookResponse(payload: GenerationWebhookPayload): Promise<void> {
    logger.info('Received generation webhook', { payload });

    if (!payload.id) {
      logger.error('Missing generation ID in payload');
      return;
    }

    if (payload.status === 'starting') {
      store.dispatch(addPendingGeneration(payload.id));
      return;
    }

    if (payload.status !== 'succeeded') {
      logger.warn('Generation failed or in progress', { 
        status: payload.status,
        error: payload.error
      });
      if (payload.status === 'failed' || payload.status === 'canceled') {
        store.dispatch(removePendingGeneration(payload.id));
      }
      return;
    }

    try {
      // Handle the successful generation
      await store.dispatch(handleGeneratedVideo(payload.id)).unwrap();
      store.dispatch(removePendingGeneration(payload.id));
      logger.info('Successfully handled generated video', { id: payload.id });
    } catch (error) {
      logger.error('Failed to handle generated video', { 
        error,
        id: payload.id
      });
      store.dispatch(removePendingGeneration(payload.id));
    }
  }
}

export const generationService = new GenerationService(); 