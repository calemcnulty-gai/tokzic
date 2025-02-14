import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import type { User } from '../../types/auth';
import type { RootState, AuthState } from '../types';
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

const initialState: AuthState = {
  // LoadingState
  isLoading: false,
  isLoaded: false,
  error: null,
  
  // Auth State
  isInitialized: false,
  isAuthenticated: false,
  user: null,
  
  // Loading States
  loadingStates: {
    isInitializing: false,
    isSigningIn: false,
    isSigningUp: false,
    isSigningOut: false
  },
  
  // Error States
  errors: {
    signIn: undefined,
    signUp: undefined,
    signOut: undefined
  }
};

// Initialize Auth
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    // Skip if already initialized or initializing
    if (state.auth.isInitialized || state.auth.loadingStates.isInitializing) {
      logger.info('Auth already initialized or initializing, skipping', {
        isInitialized: state.auth.isInitialized,
        isInitializing: state.auth.loadingStates.isInitializing
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
      state.errors = {
        signIn: undefined,
        signUp: undefined,
        signOut: undefined
      };
    },
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.loadingStates.isInitializing = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state) => {
        state.isInitialized = true;
        state.loadingStates.isInitializing = false;
        state.isLoading = false;
        state.isLoaded = true;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loadingStates.isInitializing = false;
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Failed to initialize auth';
      })

      // Sign In
      .addCase(signIn.pending, (state) => {
        state.loadingStates.isSigningIn = true;
        state.isLoading = true;
        state.errors.signIn = undefined;
      })
      .addCase(signIn.fulfilled, (state) => {
        state.loadingStates.isSigningIn = false;
        state.isLoading = false;
        state.isLoaded = true;
        state.isAuthenticated = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loadingStates.isSigningIn = false;
        state.isLoading = false;
        state.isLoaded = false;
        state.errors.signIn = action.error.message;
        state.error = action.error.message || 'Sign in failed';
      })

      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.loadingStates.isSigningUp = true;
        state.isLoading = true;
        state.errors.signUp = undefined;
      })
      .addCase(signUp.fulfilled, (state) => {
        state.loadingStates.isSigningUp = false;
        state.isLoading = false;
        state.isLoaded = true;
        state.isAuthenticated = true;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loadingStates.isSigningUp = false;
        state.isLoading = false;
        state.isLoaded = false;
        state.errors.signUp = action.error.message;
        state.error = action.error.message || 'Sign up failed';
      })

      // Sign Out
      .addCase(signOut.pending, (state) => {
        state.loadingStates.isSigningOut = true;
        state.isLoading = true;
        state.errors.signOut = undefined;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.loadingStates.isSigningOut = false;
        state.isLoading = false;
        state.isLoaded = true;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.loadingStates.isSigningOut = false;
        state.isLoading = false;
        state.isLoaded = false;
        state.errors.signOut = action.error.message;
        state.error = action.error.message || 'Sign out failed';
      })

      // Google Sign In
      .addCase(signInWithGoogle.pending, (state) => {
        state.loadingStates.isSigningIn = true;
        state.isLoading = true;
        state.errors.signIn = undefined;
      })
      .addCase(signInWithGoogle.fulfilled, (state) => {
        state.loadingStates.isSigningIn = false;
        state.isLoading = false;
        state.isLoaded = true;
        state.isAuthenticated = true;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.loadingStates.isSigningIn = false;
        state.isLoading = false;
        state.isLoaded = false;
        state.errors.signIn = action.error.message;
        state.error = action.error.message || 'Google sign in failed';
      });
  },
});

export const { clearError, setAuthenticated } = authSlice.actions;

// Selectors
export const selectAuthState = createSelector(
  [(state: RootState) => state.auth],
  (auth) => ({
    isLoading: auth.isLoading,
    isLoaded: auth.isLoaded,
    error: auth.error,
    isInitialized: auth.isInitialized,
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    loadingStates: auth.loadingStates,
    errors: auth.errors
  })
);

export const selectIsAuthInitialized = (state: RootState) => state.auth.isInitialized;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoadingStates = (state: RootState) => state.auth.loadingStates;
export const selectAuthErrors = (state: RootState) => state.auth.errors;
export const selectUser = selectFirebaseUser;

export default authSlice.reducer; 