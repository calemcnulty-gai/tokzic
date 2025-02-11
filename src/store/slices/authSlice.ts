import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '../../config/firebase';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { createLogger } from '../../utils/logger';
import { User, mapFirebaseUser } from '../../types/auth';
import { AppDispatch, RootState } from '../';
import { initializeVideoBuffer } from './videoSlice';

const logger = createLogger('AuthSlice');

// Store unsubscribe function at module level
let authStateUnsubscribe: (() => void) | null = null;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
  isInitialized: false,
};

// Initialize Firebase Auth listener
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    
    // Skip if already initialized or initializing
    if (state.auth.isInitialized || state.auth.isLoading) {
      logger.info('Auth already initialized or initializing, skipping', {
        isInitialized: state.auth.isInitialized,
        isLoading: state.auth.isLoading
      });
      return;
    }

    logger.info('Starting auth state initialization');
    
    try {
      let isResolved = false;
      await new Promise<void>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
          try {
            if (isResolved) return;

            if (firebaseUser) {
              logger.info('User authenticated in auth listener', { 
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isEmailVerified: firebaseUser.emailVerified
              });
              dispatch(setUser(mapFirebaseUser(firebaseUser)));
              logger.info('User state updated in Redux');
            } else {
              logger.info('No user found in auth listener');
              dispatch(setUser(null));
              logger.info('Null user state updated in Redux');
            }

            setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                resolve();
              }
            }, 1000);
          } catch (error) {
            logger.error('Error in auth state listener', { error });
            if (!isResolved) {
              isResolved = true;
              resolve();
            }
          }
        });

        // Store unsubscribe function in module-level variable
        authStateUnsubscribe = unsubscribe;
      });

      return;
    } catch (error) {
      logger.error('Failed to initialize auth', { error });
      throw error;
    }
  }
);

export const cleanupAuth = createAsyncThunk(
  'auth/cleanup',
  async () => {
    if (authStateUnsubscribe) {
      authStateUnsubscribe();
      authStateUnsubscribe = null;
    }
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      return result.user;
    } catch (error) {
      logger.error('Sign in failed', { error });
      throw error;
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password }: { email: string; password: string }) => {
    try {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      return result.user;
    } catch (error) {
      logger.error('Sign up failed', { error });
      throw error;
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async () => {
    try {
      await auth.signOut();
    } catch (error) {
      logger.error('Sign out failed', { error });
      throw error;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state) => {
        state.isInitialized = true;
        state.isLoading = false;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize auth';
      })

      // Sign In
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = mapFirebaseUser(action.payload);
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Sign in failed';
      })

      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = mapFirebaseUser(action.payload);
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Sign up failed';
      })

      // Sign Out
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Sign out failed';
      });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer; 