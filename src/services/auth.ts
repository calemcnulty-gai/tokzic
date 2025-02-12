import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
  type UserCredential
} from 'firebase/auth';
import { Platform } from 'react-native';
import { AUTH_CONFIG } from '../config/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthService');

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

// Helper function to safely get error details
const getErrorDetails = (error: unknown): AuthError => {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return {
      code: String(error.code) || 'auth/unknown',
      message: String(error.message) || 'An unknown error occurred'
    };
  }
  return {
    code: 'auth/unknown',
    message: error instanceof Error ? error.message : 'An unknown error occurred'
  };
};

export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    logger.info('Attempting email sign in', { email });
    const auth = serviceManager.getAuthService().getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    logger.info('Email sign in successful');
    return {
      user: userCredential.user,
      error: null
    };
  } catch (error) {
    logger.error('Email sign in failed', { error });
    return {
      user: null,
      error: getErrorDetails(error)
    };
  }
};

export const signUpWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    logger.info('Attempting email sign up', { email });
    const auth = serviceManager.getAuthService().getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    logger.info('Email sign up successful');
    return {
      user: userCredential.user,
      error: null
    };
  } catch (error) {
    logger.error('Email sign up failed', { error });
    return {
      user: null,
      error: getErrorDetails(error)
    };
  }
};

export const sendSignInLink = async (email: string): Promise<{ error: AuthError | null }> => {
  try {
    logger.info('Sending sign in link', { email });
    const auth = serviceManager.getAuthService().getAuth();
    const actionCodeSettings = {
      url: AUTH_CONFIG.emailLink.url,
      handleCodeInApp: true,
      iOS: AUTH_CONFIG.emailLink.iOS,
      android: AUTH_CONFIG.emailLink.android,
      dynamicLinkDomain: AUTH_CONFIG.emailLink.url
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    await AsyncStorage.setItem('emailForSignIn', email);
    logger.info('Sign in link sent successfully');
    return { error: null };
  } catch (error) {
    logger.error('Failed to send sign in link', { error });
    return {
      error: getErrorDetails(error)
    };
  }
};

export const completeSignInWithLink = async (email: string, link: string): Promise<AuthResponse> => {
  try {
    logger.info('Completing sign in with link');
    const auth = serviceManager.getAuthService().getAuth();
    if (!isSignInWithEmailLink(auth, link)) {
      throw new Error('Invalid sign in link');
    }

    const userCredential = await signInWithEmailLink(auth, email, link);
    logger.info('Email link sign in successful');
    return {
      user: userCredential.user,
      error: null
    };
  } catch (error) {
    logger.error('Email link sign in failed', { error });
    return {
      user: null,
      error: getErrorDetails(error)
    };
  }
};

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    logger.info('Attempting Google sign in');
    const auth = serviceManager.getAuthService().getAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    let result;
    if (Platform.OS === 'web') {
      result = await signInWithPopup(auth, provider);
    } else {
      await signInWithRedirect(auth, provider);
      result = await getRedirectResult(auth);
    }

    if (!result?.user) {
      throw new Error('No user returned from Google sign in');
    }

    logger.info('Google sign in successful');
    return {
      user: result.user,
      error: null
    };
  } catch (error) {
    logger.error('Google sign in failed', { error });
    return {
      user: null,
      error: getErrorDetails(error)
    };
  }
};

export const signOut = async (): Promise<AuthResponse> => {
  try {
    logger.info('Signing out');
    const auth = serviceManager.getAuthService().getAuth();
    await firebaseSignOut(auth);
    logger.info('Sign out successful');
    return {
      user: null,
      error: null
    };
  } catch (error) {
    logger.error('Sign out failed', { error });
    return {
      user: null,
      error: getErrorDetails(error)
    };
  }
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  const auth = serviceManager.getAuthService().getAuth();
  return onFirebaseAuthStateChanged(auth, callback);
}; 