import { auth, db } from '../config/firebase';
import { Collections, Swipe } from '../types/firestore';

export const createSwipe = async (
  videoId: string,
  direction: 'left' | 'right'
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be logged in to swipe');

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
  const user = auth.currentUser;
  if (!user) return [];

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