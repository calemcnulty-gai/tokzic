import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';
import { EXPO_CLIENT_ID, IOS_CLIENT_ID, ANDROID_CLIENT_ID } from '@env';
import { persistUser, updateAuthState, clearAuthData } from './auth-persistence';

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await persistUser(userCredential.user);
    await updateAuthState(true);
    return { user: userCredential.user, error: null };
  } catch (error) {
    const firebaseError = error as FirebaseError;
    return {
      user: null,
      error: {
        code: firebaseError.code,
        message: firebaseError.message,
      },
    };
  }
};

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await persistUser(userCredential.user);
    await updateAuthState(true);
    return { user: userCredential.user, error: null };
  } catch (error) {
    const firebaseError = error as FirebaseError;
    return {
      user: null,
      error: {
        code: firebaseError.code,
        message: firebaseError.message,
      },
    };
  }
};

export const signInWithGoogle = async (
  idToken: string
): Promise<AuthResponse> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    await persistUser(userCredential.user);
    await updateAuthState(true);
    return { user: userCredential.user, error: null };
  } catch (error) {
    const firebaseError = error as FirebaseError;
    return {
      user: null,
      error: {
        code: firebaseError.code || 'auth/unknown',
        message: firebaseError.message || 'An unexpected error occurred',
      },
    };
  }
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  try {
    await firebaseSignOut(auth);
    await clearAuthData();
    await updateAuthState(false);
    return { error: null };
  } catch (error) {
    const firebaseError = error as FirebaseError;
    return {
      error: {
        code: firebaseError.code,
        message: firebaseError.message,
      },
    };
  }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    await persistUser(user);
    await updateAuthState(!!user);
    callback(user);
  });
}; 