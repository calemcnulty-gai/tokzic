import { auth } from '../config/firebase';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firebase } from '@react-native-firebase/auth';
import { GoogleSignin, type ConfigureParams } from '@react-native-google-signin/google-signin';
import { createLogger } from '../utils/logger';
import { Platform } from 'react-native';
import { AUTH_CONFIG } from '../config/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createLogger('AuthService');

// Initialize Google Sign-In
GoogleSignin.configure({
  webClientId: AUTH_CONFIG.google.webClientId,
  scopes: AUTH_CONFIG.google.scopes,
} as ConfigureParams);

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResponse {
  user: FirebaseAuthTypes.User | null;
  error: AuthError | null;
}

export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  logger.info('Starting email/password sign in');
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    logger.info('Email sign in successful', { userId: userCredential.user.uid });
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    logger.error('Email sign in error', { 
      error: {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack
      }
    });
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

export const signUpWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  logger.info('Starting email/password sign up');
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    logger.info('Email sign up successful', { userId: userCredential.user.uid });
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    logger.error('Email sign up error', { 
      error: {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack
      }
    });
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
};

export const sendSignInLink = async (email: string): Promise<{ error: AuthError | null }> => {
  try {
    logger.info('Starting email link sign-in process', { 
      email: email.substring(0, 3) + '...',
      config: {
        url: AUTH_CONFIG.emailLink.url,
        handleCodeInApp: AUTH_CONFIG.emailLink.handleCodeInApp,
        iOS: AUTH_CONFIG.emailLink.iOS,
        android: AUTH_CONFIG.emailLink.android,
        forceSameDevice: AUTH_CONFIG.emailLink.forceSameDevice
      }
    });

    // Log the full Firebase auth instance state
    const currentUser = auth.currentUser;
    logger.debug('Current Firebase auth state', {
      hasCurrentUser: !!currentUser,
      currentUserId: currentUser?.uid,
      isEmailVerified: currentUser?.emailVerified
    });
    
    // Attempt to send the link
    logger.info('Calling sendSignInLinkToEmail');
    await auth.sendSignInLinkToEmail(email, AUTH_CONFIG.emailLink);
    
    // Save the email for later use
    logger.info('Saving email to AsyncStorage');
    await AsyncStorage.setItem('emailForSignIn', email);
    
    logger.info('Sign in link sent successfully');
    return { error: null };
  } catch (error: any) {
    logger.error('Error sending sign in link', { 
      error: {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack,
        nativeErrorCode: error.nativeErrorCode,
        nativeErrorMessage: error.nativeErrorMessage
      },
      config: {
        url: AUTH_CONFIG.emailLink.url,
        handleCodeInApp: AUTH_CONFIG.emailLink.handleCodeInApp,
        hasIOSConfig: !!AUTH_CONFIG.emailLink.iOS,
        hasAndroidConfig: !!AUTH_CONFIG.emailLink.android
      },
      firebaseState: {
        hasCurrentUser: !!auth.currentUser,
        providerId: auth.currentUser?.providerId
      }
    });
    return {
      error: {
        code: error.code || 'unknown',
        message: error.message || 'Failed to send sign in link'
      }
    };
  }
};

export const completeSignInWithLink = async (email: string, link: string): Promise<AuthResponse> => {
  try {
    logger.info('Completing sign in with link', { 
      email: email.substring(0, 3) + '...',
      hasLink: !!link
    });

    // Check if the link is valid
    if (!auth.isSignInWithEmailLink(link)) {
      throw new Error('Invalid sign in link');
    }

    const result = await auth.signInWithEmailLink(email, link);
    logger.info('Sign in with link successful', { 
      userId: result.user.uid,
      isNewUser: result.additionalUserInfo?.isNewUser
    });

    // Clear stored email after successful sign in
    await AsyncStorage.removeItem('emailForSignIn');

    return { user: result.user, error: null };
  } catch (error: any) {
    logger.error('Error completing sign in with link', { 
      error: {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack
      }
    });
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'Failed to complete sign in'
      }
    };
  }
};

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    logger.info('Starting Google sign in process', {
      webClientId: AUTH_CONFIG.google.webClientId?.substring(0, 8) + '...',
      platform: Platform.OS,
      scopes: AUTH_CONFIG.google.scopes
    });

    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    logger.info('Play Services check passed');
    
    // Get the users ID token
    const signInResult = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    logger.info('Google Sign-In completed', { 
      hasIdToken: !!tokens.idToken
    });

    if (!tokens.idToken) {
      const error = new Error('No ID token present in Google Sign-In result');
      logger.error('Missing ID token', {
        error: {
          message: error.message,
          name: error.name
        }
      });
      throw error;
    }
    
    // Create a Google credential with the token
    const googleCredential = firebase.auth.GoogleAuthProvider.credential(tokens.idToken);
    logger.info('Created Google credential');

    // Sign-in the user with the credential
    const userCredential = await auth.signInWithCredential(googleCredential);
    logger.info('Firebase sign in successful', { 
      userId: userCredential.user.uid,
      isNewUser: userCredential.additionalUserInfo?.isNewUser
    });

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    logger.error('Google sign in error', { 
      error: {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack,
        nativeErrorCode: error.nativeErrorCode,
        nativeErrorMessage: error.nativeErrorMessage
      },
      platform: Platform.OS
    });

    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unexpected error occurred during Google Sign-In',
      },
    };
  }
};

export const signOut = async (): Promise<AuthResponse> => {
  logger.info('Starting sign out process');
  try {
    await auth.signOut();
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
  return auth.onAuthStateChanged((user) => {
    logger.info('Auth state changed', { userId: user?.uid });
    callback(user);
  });
}; 