import { store } from '../store';
import { setUser } from '../store/slices/authSlice';
import { createLogger } from '../utils/logger';
import { mapFirebaseUser } from '../types/auth';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';

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
  });
} 