import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes, User } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { ANDROID_CLIENT_ID } from '@env';

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
  console.log('Starting sign up process...');
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    console.log('Sign up successful:', userCredential.user.uid);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unknown error occurred',
      },
    };
  }
};

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  console.log('Starting sign in process...');
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    console.log('Sign in successful:', userCredential.user.uid);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unknown error occurred',
      },
    };
  }
};

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Get the users ID token
    await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    
    // Create a Google credential with the token
    const googleCredential = auth.GoogleAuthProvider.credential(tokens.idToken);

    // Sign-in the user with the credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unknown error occurred',
      },
    };
  }
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  console.log('Starting sign out process...');
  try {
    await auth().signOut();
    await GoogleSignin.signOut(); // Also sign out from Google
    console.log('Sign out successful');
    return { error: null };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return {
      error: {
        code: error.code || 'unknown',
        message: error.message || 'An unknown error occurred',
      },
    };
  }
};

export const subscribeToAuthChanges = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  console.log('Setting up auth state listener...');
  return auth().onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? `User: ${user.uid}` : 'No user');
    callback(user);
  });
}; 