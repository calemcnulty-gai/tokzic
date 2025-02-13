import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectGestureState,
  selectGestureSettings,
  selectGestureStatus,
  setDoubleTapEnabled,
  setSwipeEnabled,
  startGesture,
  endGesture,
  gestureError,
  setDoubleTapSide,
  setSwipeDirection
} from '../store/slices/gestureSlice';
import { useLoadingState } from './useLoadingState';
import type { LoadingState } from '../types/state';

interface UseGesturesResult extends LoadingState {
  // Settings
  settings: {
    isDoubleTapEnabled: boolean;
    isSwipeEnabled: boolean;
  };

  // Status
  status: {
    gestureInProgress: boolean;
    doubleTapSide: 'left' | 'right' | null;
    swipeDirection: 'up' | 'down' | 'left' | 'right' | null;
    lastGestureTimestamp: number;
  };

  // Actions
  setDoubleTapEnabled: (enabled: boolean) => void;
  setSwipeEnabled: (enabled: boolean) => void;
  startGesture: () => void;
  endGesture: () => void;
  gestureError: (error: string) => void;
  setDoubleTapSide: (side: 'left' | 'right') => void;
  setSwipeDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export function useGestures(): UseGesturesResult {
  const dispatch = useDispatch();
  const gestureState = useSelector(selectGestureState);
  const settings = useSelector(selectGestureSettings);
  const status = useSelector(selectGestureStatus);

  // Gestures are always loaded by default, but we still use the pattern for consistency
  const loadingState = useLoadingState(gestureState, () => {});

  // Gesture actions
  const handleSetDoubleTapEnabled = useCallback((enabled: boolean) => {
    dispatch(setDoubleTapEnabled(enabled));
  }, [dispatch]);

  const handleSetSwipeEnabled = useCallback((enabled: boolean) => {
    dispatch(setSwipeEnabled(enabled));
  }, [dispatch]);

  const handleStartGesture = useCallback(() => {
    dispatch(startGesture());
  }, [dispatch]);

  const handleEndGesture = useCallback(() => {
    dispatch(endGesture());
  }, [dispatch]);

  const handleGestureError = useCallback((error: string) => {
    dispatch(gestureError(error));
  }, [dispatch]);

  const handleSetDoubleTapSide = useCallback((side: 'left' | 'right') => {
    dispatch(setDoubleTapSide(side));
  }, [dispatch]);

  const handleSetSwipeDirection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    dispatch(setSwipeDirection(direction));
  }, [dispatch]);

  return {
    ...loadingState,
    settings,
    status,
    setDoubleTapEnabled: handleSetDoubleTapEnabled,
    setSwipeEnabled: handleSetSwipeEnabled,
    startGesture: handleStartGesture,
    endGesture: handleEndGesture,
    gestureError: handleGestureError,
    setDoubleTapSide: handleSetDoubleTapSide,
    setSwipeDirection: handleSetSwipeDirection,
  };
} 