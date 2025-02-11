import { configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import authReducer from './slices/authSlice';
import videoReducer from './slices/videoSlice';
import gestureReducer from './slices/gestureSlice';
import navigationReducer from './slices/navigationSlice';
import interactionReducer from './slices/interactionSlice';
import uiReducer from './slices/uiSlice';
import { performanceMiddleware } from './middleware/performanceMiddleware';
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

export const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => 
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
        ignoredActionPaths: ['payload.lastVisible'],
        // Ignore these paths in the state
        ignoredPaths: ['video.lastVisible'],
      },
      thunk: {
        extraArgument: undefined,
      },
    }).concat(performanceMiddleware, loggingMiddleware),
  devTools: {
    name: 'Tokzic',
    maxAge: 50,
    trace: true,
    traceLimit: 25,
    actionsDenylist: ['video/setQuality'], // High frequency actions
    stateSanitizer: (state) => ({
      ...state,
      video: {
        ...state.video,
        videos: state.video.videos.length, // Just show count for large arrays
      },
    }),
  },
});

// Export types and hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Remove the store.subscribe logger since we now have proper middleware 