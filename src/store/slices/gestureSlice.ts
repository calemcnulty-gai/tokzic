import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GestureSlice');

interface GestureState {
  isDoubleTapEnabled: boolean;
  isSwipeEnabled: boolean;
  doubleTapSide: 'left' | 'right' | null;
  swipeDirection: 'up' | 'down' | 'left' | 'right' | null;
  gestureInProgress: boolean;
  lastGestureTimestamp: number;
}

const initialState: GestureState = {
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
      state.isDoubleTapEnabled = action.payload;
      logger.info('Double tap enabled state changed', { enabled: action.payload });
    },
    setSwipeEnabled: (state, action: PayloadAction<boolean>) => {
      state.isSwipeEnabled = action.payload;
      logger.info('Swipe enabled state changed', { enabled: action.payload });
    },
    startGesture: (state) => {
      state.gestureInProgress = true;
      state.lastGestureTimestamp = Date.now();
      logger.info('Gesture started');
    },
    endGesture: (state) => {
      state.gestureInProgress = false;
      state.doubleTapSide = null;
      state.swipeDirection = null;
      logger.info('Gesture ended');
    },
    setDoubleTapSide: (state, action: PayloadAction<'left' | 'right'>) => {
      state.doubleTapSide = action.payload;
      logger.info('Double tap side registered', { side: action.payload });
    },
    setSwipeDirection: (state, action: PayloadAction<'up' | 'down' | 'left' | 'right'>) => {
      state.swipeDirection = action.payload;
      logger.info('Swipe direction registered', { direction: action.payload });
    },
  },
});

export const {
  setDoubleTapEnabled,
  setSwipeEnabled,
  startGesture,
  endGesture,
  setDoubleTapSide,
  setSwipeDirection,
} = gestureSlice.actions;

export default gestureSlice.reducer; 