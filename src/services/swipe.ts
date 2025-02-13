import { Collections, Swipe } from '../types/firestore';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { createLogger } from '../utils/logger';
import { collection, addDoc } from 'firebase/firestore';

const logger = createLogger('SwipeService');

export const createSwipe = async (
  videoId: string,
  direction: 'left' | 'right'
): Promise<void> => {
  try {
    const firestoreService = serviceManager.getFirestoreService();
    const authService = serviceManager.getAuthService();
    
    if (!firestoreService || !authService) {
      logger.error('Services not initialized');
      throw new Error('Firebase services not initialized');
    }

    const auth = authService.getAuth();
    const db = firestoreService['db'];
    
    const user = auth.currentUser;
    if (!user) {
      logger.error('User must be logged in to swipe');
      throw new Error('User must be logged in to swipe');
    }

    const swipe: Omit<Swipe, 'id'> = {
      videoId,
      userId: user.uid,
      direction,
      createdAt: Date.now(),
    };

    logger.info('Creating swipe record', {
      videoId,
      direction,
      userId: user.uid
    });

    const swipesRef = collection(db, Collections.SWIPES);
    await addDoc(swipesRef, swipe);

    logger.info('Swipe record created successfully');
  } catch (error) {
    logger.error('Failed to create swipe', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      videoId,
      direction
    });
    throw error;
  }
};

export const getUserSwipes = async (videoId: string): Promise<Swipe[]> => {
  const auth = serviceManager.getAuthService().getAuth();
  const db = serviceManager.getFirestoreService().getFirestore();
  
  const user = auth.currentUser;
  if (!user) {
    logger.debug('No user logged in, returning empty swipes array');
    return [];
  }

  const snapshot = await db
    .collection(Collections.SWIPES)
    .where('userId', '==', user.uid)
    .where('videoId', '==', videoId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Swipe[];
}; 