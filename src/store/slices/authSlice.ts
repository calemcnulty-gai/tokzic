import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import type { User } from '../../types/auth';
import type { RootState } from '../';
import { 
  selectUser as selectFirebaseUser
} from './firebase/selectors';
import { 
  initializeAuth as initializeFirebaseAuth,
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOut as firebaseSignOut,
  signInWithGoogle as firebaseSignInWithGoogle
} from './firebase/thunks/authThunks';
import { setUser } from './firebase/firebaseSlice';

const logger = createLogger('AuthSlice');

interface LoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

interface AuthState {
  isLoading: boolean;  // Currently loading
  isLoaded: boolean;   // Successfully loaded
  error: string | null; // Any error that occurred
  isInitialized: boolean;
}

const initialState: AuthState = {
  isLoading: false,
  isLoaded: false,
  error: null,
  isInitialized: false,
};

// Initialize Auth
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    // Skip if already initialized or initializing
    if (state.auth.isInitialized || state.auth.isLoading) {
      logger.info('Auth already initialized or initializing, skipping', {
        isInitialized: state.auth.isInitialized,
        isLoading: state.auth.isLoading
      });
      return;
    }

    await dispatch(initializeFirebaseAuth()).unwrap();
  }
);

// Sign In
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: { email: string; password: string }, { dispatch }) => {
    await dispatch(firebaseSignIn(credentials)).unwrap();
  }
);

// Sign Up
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (credentials: { email: string; password: string }, { dispatch }) => {
    await dispatch(firebaseSignUp(credentials)).unwrap();
  }
);

// Sign Out
export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { dispatch }) => {
    await dispatch(firebaseSignOut()).unwrap();
  }
);

// Google Sign In
export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { dispatch }) => {
    await dispatch(firebaseSignInWithGoogle()).unwrap();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.isLoaded = false;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state) => {
        state.isInitialized = true;
        state.isLoading = false;
        state.isLoaded = true;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Failed to initialize auth';
      })

      // Sign In
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state) => {
        state.isLoading = false;
        state.isLoaded = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Sign in failed';
      })

      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state) => {
        state.isLoading = false;
        state.isLoaded = true;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Sign up failed';
      })

      // Sign Out
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.isLoaded = true;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Sign out failed';
      })

      // Google Sign In
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state) => {
        state.isLoading = false;
        state.isLoaded = true;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Google sign in failed';
      });
  },
});

export const { clearError } = authSlice.actions;

// Selectors
export const selectAuthState = createSelector(
  [(state: RootState) => state.auth],
  (auth) => ({
    isLoading: auth.isLoading,
    isLoaded: auth.isLoaded,
    error: auth.error
  })
);
export const selectIsAuthInitialized = (state: RootState) => state.auth.isInitialized;
export const selectUser = selectFirebaseUser;

export default authSlice.reducer; 