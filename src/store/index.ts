import { configureStore, Middleware, ConfigureStoreOptions } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import authReducer from './slices/authSlice';
import videoReducer from './slices/videoSlice';
import gestureReducer from './slices/gestureSlice';
import navigationReducer from './slices/navigationSlice';
import interactionReducer from './slices/interactionSlice';
import uiReducer from './slices/uiSlice';
// Performance middleware temporarily removed - can be re-added when we need more detailed
// performance monitoring and analytics. See /src/store/middleware/performanceMiddleware.ts
// import { performanceMiddleware } from './middleware/performanceMiddleware';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('Store');

const reducer = {
  auth: authReducer,
  video: videoReducer,
  gesture: gestureReducer,
  navigation: navigationReducer,
  interaction: interactionReducer,
  ui: uiReducer,
};

const storeConfig: ConfigureStoreOptions<any> = {
  reducer,
  middleware: getDefaultMiddleware => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'video/initialize/fulfilled',
          'video/rotateForward/fulfilled',
          'video/rotateBackward/fulfilled',
          'video/refresh/fulfilled',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          'payload.lastVisible',
          'payload.videos.*.metadata',  // Ignore metadata in video arrays
          'payload.metadata',           // Ignore individual metadata objects
          'meta.arg.metadata'           // Ignore metadata in thunk arguments
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'video.lastVisible',
          'video.videos.*.metadata',    // Ignore metadata in video arrays
          'video.currentVideo.metadata' // Ignore current video metadata
        ],
      },
      thunk: {
        extraArgument: undefined,
      },
    }).concat(loggingMiddleware),
  devTools: {
    name: 'Tokzic',
    maxAge: 50,
    trace: true,
    traceLimit: 25,
    actionsDenylist: ['video/setQuality'], // High frequency actions
    stateSanitizer: (state: any) => ({
      ...state,
      video: state.video ? {
        ...state.video,
        videos: state.video.videos?.length ?? 0, // Just show count for large arrays
      } : undefined,
    }),
  },
};

export const store = configureStore(storeConfig);

// Export types and hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Remove the store.subscribe logger since we now have proper middleware 