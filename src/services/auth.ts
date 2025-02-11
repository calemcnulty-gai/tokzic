import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createLogger } from '../utils/logger';
import { Platform } from 'react-native';
import { ANDROID_CLIENT_ID } from '@env';

const logger = createLogger('AuthService');

// Initialize Google Sign-In
GoogleSignin.configure({
  webClientId: ANDROID_CLIENT_ID,
});

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResponse {
  user: FirebaseAuthTypes.User | null;
  error: AuthError | null;
}

export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  logger.info('Starting sign up process');
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    logger.info('Sign up successful', { userId: userCredential.user.uid });
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    logger.error('Sign up error', { error });
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  logger.info('Starting sign in process');
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    logger.info('Sign in successful', { userId: userCredential.user.uid });
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    logger.error('Sign in error', { error });
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Get the users ID token
    const { idToken } = await GoogleSignin.signIn();
    
    // Create a Google credential with the token
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Sign-in the user with the credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    logger.error('Google sign in error', { error });
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

export const signOut = async (): Promise<AuthResponse> => {
  logger.info('Starting sign out process');
  try {
    await auth().signOut();
    await GoogleSignin.signOut(); // Also sign out from Google
    logger.info('Sign out successful');
    return { user: null, error: null };
  } catch (error: any) {
    logger.error('Sign out error', { error });
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

export const onAuthStateChanged = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  logger.info('Setting up auth state listener');
  return auth().onAuthStateChanged((user) => {
    logger.info('Auth state changed', { userId: user?.uid });
    callback(user);
  });
}; 