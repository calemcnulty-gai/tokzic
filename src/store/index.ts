import { configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import authReducer from './slices/authSlice';
import videoReducer from './slices/videoSlice';
import gestureReducer from './slices/gestureSlice';
import navigationReducer from './slices/navigationSlice';
import interactionReducer from './slices/interactionSlice';
import uiReducer from './slices/uiSlice';
import firebaseReducer from './slices/firebase/firebaseSlice';
// Performance middleware temporarily removed - can be re-added when we need more detailed
// performance monitoring and analytics. See /src/store/middleware/performanceMiddleware.ts
// import { performanceMiddleware } from './middleware/performanceMiddleware';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('Store');

// Define root reducer
const rootReducer = {
  auth: authReducer,
  video: videoReducer,
  gesture: gestureReducer,
  navigation: navigationReducer,
  interaction: interactionReducer,
  ui: uiReducer,
  firebase: firebaseReducer,
};

// Create store configuration
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'video/initialize/fulfilled',
          'video/rotateForward/fulfilled',
          'video/rotateBackward/fulfilled',
          'video/refresh/fulfilled',
          'firebase/initialize/fulfilled',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          'payload.lastVisible',
          'payload.videos.*.metadata',  // Ignore metadata in video arrays
          'payload.metadata',           // Ignore metadata objects
          'meta.arg.metadata',          // Ignore metadata in thunk arguments
          'payload.app',                // Ignore Firebase app instance
          'payload.auth',               // Ignore Firebase auth instance
          'payload.db',                 // Ignore Firebase db instance
          'payload.storage',            // Ignore Firebase storage instance
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'video.lastVisible',
          'video.videos.*.metadata',    // Ignore metadata in video arrays
          'video.currentVideo.metadata', // Ignore current video metadata
          'firebase.app',               // Ignore Firebase app instance
          'firebase.auth',              // Ignore Firebase auth instance
          'firebase.db',                // Ignore Firebase db instance
          'firebase.storage',           // Ignore Firebase storage instance
        ],
      },
      thunk: {
        extraArgument: undefined,
      },
    }).concat(loggingMiddleware),
  devTools: process.env.NODE_ENV === 'development',
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();

export { store }; 