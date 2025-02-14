import { store } from '../store';
import { setUser } from '../store/slices/authSlice';
import { createLogger } from '../utils/logger';
import { mapFirebaseUser } from '../types/auth';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { subscribeToGeneratedVideos, unsubscribeFromGeneratedVideos } from '../store/slices/videoSlice';

const logger = createLogger('AuthListener');

export function initializeAuthListener() {
  logger.info('🔐 Initializing auth state listener...');
  
  const auth = serviceManager.getAuthService().getAuth();
  
  return auth.onAuthStateChanged((user) => {
    logger.info('👤 Auth state changed:', {
      uid: user?.uid,
      email: user?.email,
      isAnonymous: user?.isAnonymous,
      providerId: user?.providerId,
    });

    // Map the Firebase user to our User type before dispatching
    const mappedUser = mapFirebaseUser(user);
    store.dispatch(setUser(mappedUser));

    // Handle generated videos subscription based on auth state
    if (mappedUser) {
      logger.info('User logged in, subscribing to generated videos');
      store.dispatch(subscribeToGeneratedVideos());
    } else {
      logger.info('User logged out, unsubscribing from generated videos');
      store.dispatch(unsubscribeFromGeneratedVideos());
    }
  });
} 