import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { createLogger } from '../../../utils/logger';
import type { RootState } from '../../types';
import type { User } from '../../../types/auth';
import { mapFirebaseUser } from '../../../types/auth';
import { serviceManager } from './services/ServiceManager';
import type { CacheState } from '../../types';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

const logger = createLogger('FirebaseSlice');

// Standard loading state interface
interface LoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

export type FirebaseState = {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  user: User | null;
  cache: CacheState;
  uploadProgress: Record<string, number>;
  loadingStates: {
    auth: {
      isInitializing: boolean;
      isSigningIn: boolean;
      isSigningUp: boolean;
      isSigningOut: boolean;
    };
    firestore: {
      isFetching: boolean;
      isUpdating: boolean;
      isDeleting: boolean;
      isBatchProcessing: boolean;
    };
    storage: {
      isUploading: boolean;
      isDownloading: boolean;
      isDeleting: boolean;
      isListing: boolean;
      isUpdatingMetadata: boolean;
    };
    analytics: {
      isLoggingEvent: boolean;
      isUpdatingUserProperties: boolean;
      isTrackingScreen: boolean;
    };
  };
}

const initialState: FirebaseState = {
  isInitialized: false,
  isInitializing: false,
  error: null,
  user: null,
  cache: {
    documents: {},
    metadata: {},
    comments: {},
    likes: {},
    dislikes: {},
    tips: {}
  },
  uploadProgress: {},
  loadingStates: {
    auth: {
      isInitializing: false,
      isSigningIn: false,
      isSigningUp: false,
      isSigningOut: false
    },
    firestore: {
      isFetching: false,
      isUpdating: false,
      isDeleting: false,
      isBatchProcessing: false
    },
    storage: {
      isUploading: false,
      isDownloading: false,
      isDeleting: false,
      isListing: false,
      isUpdatingMetadata: false
    },
    analytics: {
      isLoggingEvent: false,
      isUpdatingUserProperties: false,
      isTrackingScreen: false
    }
  }
};

// Action Types
export const INITIALIZE_FIREBASE = 'firebase/initialize';
export const INITIALIZE_FIREBASE_SUCCESS = 'firebase/initializeSuccess';
export const INITIALIZE_FIREBASE_FAILURE = 'firebase/initializeFailure';
export const SET_USER = 'firebase/setUser';

// Action Creators
export const initializeFirebaseStart = createAction('firebase/initialize');
export const initializeFirebaseSuccess = createAction('firebase/initializeSuccess');
export const initializeFirebaseFailure = createAction<string>('firebase/initializeFailure');
export const setUser = createAction<User | null>('firebase/setUser');

// Action creators
export const initializeFirebase = () => {
  return async (dispatch: any) => {
    dispatch(initializeFirebaseStart());
    
    try {
      const config = {
        apiKey: FIREBASE_API_KEY,
        authDomain: FIREBASE_AUTH_DOMAIN,
        projectId: FIREBASE_PROJECT_ID,
        storageBucket: FIREBASE_STORAGE_BUCKET,
        messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
        appId: FIREBASE_APP_ID,
      };

      logger.info('Initializing Firebase');
      const app = initializeApp(config);
      
      // Initialize services
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);

      // Initialize service manager
      await serviceManager.initializeServices({ app, auth, db, storage });

      // Set up auth state listener
      onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        dispatch(setUser(mapFirebaseUser(firebaseUser)));
      });

      // Mark Firebase as fully initialized
      dispatch(initializeFirebaseSuccess());

    } catch (error) {
      logger.error('Failed to initialize Firebase', { error });
      dispatch(initializeFirebaseFailure(error instanceof Error ? error.message : 'Failed to initialize Firebase'));
    }
  };
};

const firebaseSlice = createSlice({
  name: 'firebase',
  initialState,
  reducers: {
    setUploadProgress: (state, action: PayloadAction<{ path: string; progress: number }>) => {
      state.uploadProgress[action.payload.path] = action.payload.progress;
    },
    clearUploadProgress: (state, action: PayloadAction<{ path: string }>) => {
      delete state.uploadProgress[action.payload.path];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeFirebaseStart, (state) => {
        state.isInitializing = true;
        state.error = null;
      })
      .addCase(initializeFirebaseSuccess, (state) => {
        state.isInitializing = false;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(initializeFirebaseFailure, (state, action) => {
        state.isInitializing = false;
        state.isInitialized = false;
        state.error = action.payload;
      })
      .addCase(setUser, (state, action) => {
        state.loadingStates.auth.isInitializing = false;
        state.user = action.payload;
      });
  }
});

export const { setUploadProgress, clearUploadProgress } = firebaseSlice.actions;

// Selectors
export const selectFirebaseLoadingState = (state: RootState) => ({
  isLoading: state.firebase.isInitializing,
  isLoaded: state.firebase.isInitialized,
  error: state.firebase.error
});

export const selectFirebaseAuth = (state: RootState) => {
  if (!state.firebase.isInitialized) {
    return {
      isInitialized: false,
      user: null
    };
  }
  
  try {
    const authService = serviceManager.getAuthService();
    const auth = authService.getAuth();
    return {
      isInitialized: true,
      user: auth?.currentUser || null
    };
  } catch (error) {
    logger.warn('Failed to get auth service', { error });
    return {
      isInitialized: false,
      user: null
    };
  }
};

export const selectFirebaseServices = (state: RootState) => ({
  auth: state.firebase.isInitialized && !!serviceManager.getAuthService(),
  firestore: state.firebase.isInitialized && !!serviceManager.getFirestoreService(),
  storage: state.firebase.isInitialized && !!serviceManager.getStorageService()
});

export default firebaseSlice.reducer; 