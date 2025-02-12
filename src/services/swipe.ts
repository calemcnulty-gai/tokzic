import { Collections, Swipe } from '../types/firestore';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('SwipeService');

export const createSwipe = async (
  videoId: string,
  direction: 'left' | 'right'
): Promise<void> => {
  const auth = serviceManager.getAuthService().getAuth();
  const db = serviceManager.getFirestoreService().getFirestore();
  
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

  await db
    .collection(Collections.SWIPES)
    .add(swipe);
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