import React, { useCallback } from 'react';
import { Dimensions, StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { VideoPlayer } from './VideoPlayer';
import { VideoOverlay } from './feed/VideoOverlay';
import { CommentPanel } from './feed/CommentPanel';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createLogger } from '../utils/logger';
import { createAction, createSelector } from '@reduxjs/toolkit';
import type { RootState, VideoState } from '../store/types';
import type { VideoWithMetadata } from '../types/video';
import { ErrorBoundary } from './ErrorBoundary';
import { handleSwipeGesture } from '../store/slices/videoSlice';

const logger = createLogger('SwipeableVideoPlayer');
const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.2;
const VERTICAL_SWIPE_THRESHOLD = height * 0.2;
const DIRECTION_LOCK_THRESHOLD = 10;

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

interface SwipeableVideoPlayerProps {
  currentVideo: VideoWithMetadata;
}

const triggerSwipe = createAction<{ direction: SwipeDirection }>('video/triggerSwipe');

// Create a memoized selector for video data readiness
const selectVideoReadiness = createSelector(
  [(state: RootState) => state.video],
  (videoState) => ({
    isReady: videoState.isVideosLoaded && videoState.isMetadataLoaded && videoState.currentVideo !== null,
    isLoading: videoState.isLoading,
    error: videoState.error
  })
);

export function SwipeableVideoPlayer({ currentVideo }: SwipeableVideoPlayerProps) {
  const dispatch = useAppDispatch();
  const isMounted = React.useRef(true);
  const isGestureInProgress = React.useRef(false);
  
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Shared values for gesture handling
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isVerticalGesture = useSharedValue<boolean | null>(null);

  // Get loading state from Redux with proper typing
  const { isReady, isLoading, error } = useAppSelector((state: RootState) => selectVideoReadiness(state));
  const loadingStates = useAppSelector((state: RootState) => state.video.loadingStates);

  const dispatchIfMounted = useCallback((action: any) => {
    if (isMounted.current && !isGestureInProgress.current) {
      dispatch(action);
    }
  }, [dispatch]);

  const handleGestureEnd = useCallback((direction: SwipeDirection) => {
    if (!isMounted.current || isGestureInProgress.current) {
      logger.debug('Gesture end ignored', {
        isMounted: isMounted.current,
        isGestureInProgress: isGestureInProgress.current,
        direction
      });
      return;
    }
    
    logger.debug('Handling gesture end', { direction });
    isGestureInProgress.current = true;
    
    // We'll let the animation complete before dispatching the action
    setTimeout(() => {
      if (isMounted.current) {
        dispatch(handleSwipeGesture({ direction }))
          .unwrap()
          .then(() => {
            logger.debug('Swipe gesture completed successfully', { direction });
          })
          .catch((error) => {
            logger.error('Swipe gesture failed', { direction, error });
          })
          .finally(() => {
            if (isMounted.current) {
              isGestureInProgress.current = false;
            }
          });
      }
    }, 200); // Match the animation duration
  }, [dispatch]);

  // Handle loading and error states
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (error) {
    return null;
  }

  if (!isReady || !currentVideo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  const gesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = 1;
      isVerticalGesture.value = null;
    })
    .onUpdate((event) => {
      'worklet';
      if (isVerticalGesture.value === null) {
        const absX = Math.abs(event.translationX);
        const absY = Math.abs(event.translationY);
        
        if (absX > DIRECTION_LOCK_THRESHOLD || absY > DIRECTION_LOCK_THRESHOLD) {
          isVerticalGesture.value = absY > absX;
        }
      }

      if (isVerticalGesture.value === true) {
        translateY.value = event.translationY;
        opacity.value = withTiming(Math.max(0.5, 1 - Math.abs(event.translationY) / VERTICAL_SWIPE_THRESHOLD * 0.5));
      } else if (isVerticalGesture.value === false) {
        translateX.value = event.translationX;
        opacity.value = withTiming(Math.max(0.5, 1 - Math.abs(event.translationX) / SWIPE_THRESHOLD * 0.5));
      }
    })
    .onEnd((event) => {
      'worklet';
      
      if (isVerticalGesture.value === true) {
        if (Math.abs(translateY.value) > VERTICAL_SWIPE_THRESHOLD) {
          const direction = translateY.value > 0 ? 'down' : 'up';
          
          translateY.value = withSpring(
            direction === 'down' ? height : -height,
            {
              damping: 20,
              stiffness: 90,
            }
          );
          translateX.value = withSpring(0);
          opacity.value = withTiming(0, { duration: 200 });
          
          runOnJS(handleGestureEnd)(direction);
        } else {
          translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 400,
          });
          opacity.value = withTiming(1, { duration: 200 });
        }
      } else if (isVerticalGesture.value === false) {
        if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
          const direction = translateX.value > 0 ? 'right' : 'left';
          
          translateX.value = withSpring(
            direction === 'right' ? width : -width,
            {
              damping: 20,
              stiffness: 90,
            }
          );
          translateY.value = withSpring(0);
          opacity.value = withTiming(0, { duration: 200 });
          
          runOnJS(handleGestureEnd)(direction);
        } else {
          translateX.value = withSpring(0, {
            damping: 20,
            stiffness: 400,
          });
          opacity.value = withTiming(1, { duration: 200 });
        }
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        opacity.value = withTiming(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <ErrorBoundary>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {currentVideo && currentVideo.video && currentVideo.metadata && (
            <>
              <ErrorBoundary>
                <VideoPlayer
                  video={currentVideo.video}
                  metadata={currentVideo.metadata}
                  shouldPlay={!isLoading && !loadingStates.video.isLoading}
                />
              </ErrorBoundary>
              <ErrorBoundary>
                <VideoOverlay video={currentVideo} />
              </ErrorBoundary>
              <ErrorBoundary>
                <CommentPanel videoId={currentVideo.video.id} />
              </ErrorBoundary>
            </>
          )}
        </Animated.View>
      </GestureDetector>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
}); 