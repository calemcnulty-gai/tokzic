import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Dimensions } from 'react-native';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import type { RootState, AppDispatch } from '../store';
import {
  startGesture,
  endGesture,
  setDoubleTapSide,
  setSwipeDirection,
} from '../store/slices/gestureSlice';
import { toggleLike } from '../store/slices/interactionSlice';
import { createLogger } from '../utils/logger';

const logger = createLogger('useVideoGestures');

const DOUBLE_TAP_DELAY = 300;
const SWIPE_THRESHOLD = 50;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UseVideoGesturesProps {
  videoId: string;
  userId: string;
}

export function useVideoGestures({ videoId, userId }: UseVideoGesturesProps) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    isDoubleTapEnabled,
    isSwipeEnabled,
    gestureInProgress,
    lastGestureTimestamp,
  } = useSelector((state: RootState) => state.gesture);

  // Handle double tap
  const handleDoubleTap = useCallback((event: GestureResponderEvent) => {
    if (!isDoubleTapEnabled || gestureInProgress) return false;

    const now = Date.now();
    const timeSinceLastTap = now - lastGestureTimestamp;

    if (timeSinceLastTap <= DOUBLE_TAP_DELAY) {
      const tapX = event.nativeEvent.locationX;
      const side = tapX < SCREEN_WIDTH / 2 ? 'left' : 'right';

      logger.info('Double tap detected', { side, videoId });
      
      dispatch(startGesture());
      dispatch(setDoubleTapSide(side));
      
      // Handle like action on right-side double tap
      if (side === 'right') {
        dispatch(toggleLike({ videoId, userId }));
      }

      setTimeout(() => {
        dispatch(endGesture());
      }, 300);

      return true;
    }

    return false;
  }, [dispatch, isDoubleTapEnabled, gestureInProgress, lastGestureTimestamp, videoId, userId]);

  // Handle swipe
  const handleSwipe = useCallback((gestureState: PanResponderGestureState) => {
    if (!isSwipeEnabled || gestureInProgress) return false;

    const { dx, dy } = gestureState;
    const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
    
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      return false;
    }

    dispatch(startGesture());

    if (isHorizontalSwipe) {
      const direction = dx > 0 ? 'right' : 'left';
      dispatch(setSwipeDirection(direction));
      logger.info('Horizontal swipe detected', { direction, videoId });
    } else {
      const direction = dy > 0 ? 'down' : 'up';
      dispatch(setSwipeDirection(direction));
      logger.info('Vertical swipe detected', { direction, videoId });
    }

    setTimeout(() => {
      dispatch(endGesture());
    }, 300);

    return true;
  }, [dispatch, isSwipeEnabled, gestureInProgress, videoId]);

  // Create pan responder config
  const panResponderConfig = {
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      handleDoubleTap(event);
    },
    onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      handleSwipe(gestureState);
    },
    onPanResponderRelease: () => {
      if (gestureInProgress) {
        dispatch(endGesture());
      }
    },
  };

  return {
    panResponderConfig,
    isDoubleTapEnabled,
    isSwipeEnabled,
    gestureInProgress,
  };
} 