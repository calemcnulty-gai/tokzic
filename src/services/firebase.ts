import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('FirebaseService');

// Get Firebase service instances
export const getAuth = () => {
  const auth = serviceManager.getAuthService().getAuth();
  if (!auth) {
    logger.error('Auth service not initialized');
    throw new Error('Auth service not initialized');
  }
  return auth;
};

export const getFirestore = () => {
  const db = serviceManager.getFirestoreService().getFirestore();
  if (!db) {
    logger.error('Firestore service not initialized');
    throw new Error('Firestore service not initialized');
  }
  return db;
};

export const getStorage = () => {
  const storage = serviceManager.getStorageService().getStorage();
  if (!storage) {
    logger.error('Storage service not initialized');
    throw new Error('Storage service not initialized');
  }
  return storage;
}; 