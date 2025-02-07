import { auth, firestore } from './firebase';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: number;
  updatedAt: number;
}

export const createUserProfile = async (user: FirebaseAuthTypes.User): Promise<void> => {
  const userProfile: UserProfile = {
    id: user.uid,
    email: user.email || '',
    displayName: user.displayName || undefined,
    photoURL: user.photoURL || undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await firestore().collection('users').doc(user.uid).set(userProfile);
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const userDoc = await firestore().collection('users').doc(userId).get();
  return userDoc.exists() ? userDoc.data() as UserProfile : null;
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  const updateData = {
    ...updates,
    updatedAt: Date.now(),
  };
  
  await firestore().collection('users').doc(userId).update(updateData);
}; 