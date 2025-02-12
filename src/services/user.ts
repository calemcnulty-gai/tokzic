import type { User } from 'firebase/auth';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserService');

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: number;
  updatedAt: number;
}

export const createUserProfile = async (user: User): Promise<void> => {
  const db = serviceManager.getFirestoreService().getFirestore();
  
  const userProfile: UserProfile = {
    id: user.uid,
    email: user.email || '',
    displayName: user.displayName || undefined,
    photoURL: user.photoURL || undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  logger.info('Creating user profile', { userId: user.uid });
  await db.collection('users').doc(user.uid).set(userProfile);
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const db = serviceManager.getFirestoreService().getFirestore();
  
  logger.debug('Fetching user profile', { userId });
  const userDoc = await db.collection('users').doc(userId).get();
  return userDoc.exists ? (userDoc.data() as UserProfile) : null;
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  const db = serviceManager.getFirestoreService().getFirestore();
  
  const updateData = {
    ...updates,
    updatedAt: Date.now(),
  };
  
  logger.info('Updating user profile', { userId, updates });
  await db.collection('users').doc(userId).update(updateData);
}; 