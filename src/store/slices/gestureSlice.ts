import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../types';
import type { GestureState } from '../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GestureSlice');

const initialState: GestureState = {
  // Loading state
  isLoading: false,
  isLoaded: true, // Gestures are loaded by default
  error: null,

  // Gesture state
  isDoubleTapEnabled: true,
  isSwipeEnabled: true,
  doubleTapSide: null,
  swipeDirection: null,
  gestureInProgress: false,
  lastGestureTimestamp: 0,
};

const gestureSlice = createSlice({
  name: 'gesture',
  initialState,
  reducers: {
    setDoubleTapEnabled: (state, action: PayloadAction<boolean>) => {
      const oldValue = state.isDoubleTapEnabled;
      state.isDoubleTapEnabled = action.payload;
      logger.info('Double tap enabled state changed', { 
        oldValue,
        newValue: action.payload,
        timeSinceLastGesture: Date.now() - state.lastGestureTimestamp
      });
    },
    setSwipeEnabled: (state, action: PayloadAction<boolean>) => {
      const oldValue = state.isSwipeEnabled;
      state.isSwipeEnabled = action.payload;
      logger.info('Swipe enabled state changed', { 
        oldValue,
        newValue: action.payload,
        timeSinceLastGesture: Date.now() - state.lastGestureTimestamp
      });
    },
    startGesture: (state) => {
      logger.info('Starting new gesture', {
        previousGestureInProgress: state.gestureInProgress,
        timeSinceLastGesture: Date.now() - state.lastGestureTimestamp,
        swipeEnabled: state.isSwipeEnabled,
        doubleTapEnabled: state.isDoubleTapEnabled
      });
      
      state.isLoading = true;
      state.isLoaded = false;
      state.error = null;
      state.gestureInProgress = true;
      state.lastGestureTimestamp = Date.now();
    },
    endGesture: (state) => {
      logger.info('Ending gesture', {
        duration: Date.now() - state.lastGestureTimestamp,
        finalDoubleTapSide: state.doubleTapSide,
        finalSwipeDirection: state.swipeDirection
      });
      
      state.isLoading = false;
      state.isLoaded = true;
      state.gestureInProgress = false;
      state.doubleTapSide = null;
      state.swipeDirection = null;
    },
    gestureError: (state, action: PayloadAction<string>) => {
      logger.error('Gesture error occurred', { 
        error: action.payload,
        gestureInProgress: state.gestureInProgress,
        timeSinceLastGesture: Date.now() - state.lastGestureTimestamp,
        doubleTapSide: state.doubleTapSide,
        swipeDirection: state.swipeDirection
      });
      
      state.isLoading = false;
      state.isLoaded = false;
      state.error = action.payload;
      state.gestureInProgress = false;
      state.doubleTapSide = null;
      state.swipeDirection = null;
    },
    setDoubleTapSide: (state, action: PayloadAction<'left' | 'right'>) => {
      logger.info('Double tap side registered', { 
        side: action.payload,
        previousSide: state.doubleTapSide,
        gestureInProgress: state.gestureInProgress,
        timeSinceLastGesture: Date.now() - state.lastGestureTimestamp
      });
      state.doubleTapSide = action.payload;
    },
    setSwipeDirection: (state, action: PayloadAction<'up' | 'down' | 'left' | 'right'>) => {
      logger.info('Swipe direction registered', { 
        direction: action.payload,
        previousDirection: state.swipeDirection,
        gestureInProgress: state.gestureInProgress,
        timeSinceLastGesture: Date.now() - state.lastGestureTimestamp
      });
      state.swipeDirection = action.payload;
    },
  },
});

export const {
  setDoubleTapEnabled,
  setSwipeEnabled,
  startGesture,
  endGesture,
  gestureError,
  setDoubleTapSide,
  setSwipeDirection,
} = gestureSlice.actions;

// Selectors
export const selectGestureState = (state: RootState): GestureState => state.gesture;

export const selectGestureSettings = (state: RootState) => ({
  isDoubleTapEnabled: state.gesture.isDoubleTapEnabled,
  isSwipeEnabled: state.gesture.isSwipeEnabled
});

export const selectGestureStatus = (state: RootState) => ({
  gestureInProgress: state.gesture.gestureInProgress,
  doubleTapSide: state.gesture.doubleTapSide,
  swipeDirection: state.gesture.swipeDirection,
  lastGestureTimestamp: state.gesture.lastGestureTimestamp
});

export default gestureSlice.reducer; 