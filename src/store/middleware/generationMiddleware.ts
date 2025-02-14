import { Middleware } from '@reduxjs/toolkit';
import { generationService } from '../../services/generation';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GenerationMiddleware');

export const generationMiddleware: Middleware = (store) => {
  let isSubscribed = false;

  return (next) => (action) => {
    const result = next(action);
    
    // Check if the action is related to setting the Firebase user
    if (action.type === 'firebase/setUser') {
      const user = action.payload;
      
      if (user && !isSubscribed) {
        logger.info('User authenticated, subscribing to generated videos');
        generationService.subscribeToGeneratedVideos();
        isSubscribed = true;
      } else if (!user && isSubscribed) {
        logger.info('User logged out, unsubscribing from generated videos');
        generationService.unsubscribeFromGeneratedVideos();
        isSubscribed = false;
      }
    }

    return result;
  };
}; 