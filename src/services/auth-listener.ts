import auth from '@react-native-firebase/auth';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';
import { createLogger } from '../utils/logger';
import { mapFirebaseUser } from '../types/auth';

const logger = createLogger('AuthListener');

export function initializeAuthListener() {
  logger.info('🔐 Initializing auth state listener...');
  
  return auth().onAuthStateChanged((user) => {
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