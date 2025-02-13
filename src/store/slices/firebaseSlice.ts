import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FirebaseSlice');

interface FirebaseState {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
}

const initialState: FirebaseState = {
  app: null,
  auth: null,
  db: null,
  storage: null,
  isInitialized: false,
  isInitializing: false,
  error: null,
};

// Initialize Firebase services
export const initializeFirebase = createAsyncThunk(
  'firebase/initialize',
  async (_, { rejectWithValue }) => {
    try {
      logger.info('Initializing Firebase services');

      // Firebase configuration from environment variables
      const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      };

      // Initialize or get existing Firebase app
      let app: FirebaseApp;
      try {
        app = getApp();
        logger.info('Using existing Firebase app');
      } catch {
        app = initializeApp(firebaseConfig);
        logger.info('Created new Firebase app');
      }

      // Initialize Firebase services
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);

      logger.info('Firebase services initialized successfully');

      return { app, auth, db, storage };
    } catch (error) {
      logger.error('Failed to initialize Firebase services', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize Firebase');
    }
  }
);

const firebaseSlice = createSlice({
  name: 'firebase',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeFirebase.pending, (state) => {
        state.isInitializing = true;
        state.error = null;
      })
      .addCase(initializeFirebase.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.isInitialized = true;
        state.app = action.payload.app;
        state.auth = action.payload.auth;
        state.db = action.payload.db;
        state.storage = action.payload.storage;
      })
      .addCase(initializeFirebase.rejected, (state, action) => {
        state.isInitializing = false;
        state.error = action.payload as string || 'Failed to initialize Firebase';
      });
  },
});

export const { clearError } = firebaseSlice.actions;
export default firebaseSlice.reducer; 