import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
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
import { workletLogger, safeSerializeError } from '../utils/workletLogger';
import { VideoData } from '../services/video';
import { VideoMetadata } from '../types/firestore';
import { 
  handleSwipeGesture,
  handleCommentSubmission,
  selectCurrentVideo,
  selectVideoComments,
  selectIsLoadingComments,
  selectCommentsVisibility,
  selectSwipeState
} from '../store/slices/videoSlice';
import { createAction } from '@reduxjs/toolkit';

const logger = createLogger('SwipeableVideoPlayer');
const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.2;
const VERTICAL_SWIPE_THRESHOLD = height * 0.2;
const DIRECTION_LOCK_THRESHOLD = 10;

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

interface SwipeableVideoPlayerProps {
  currentVideo: VideoData;
  metadata: VideoMetadata;
  isLoading: boolean;
}

const triggerSwipe = createAction<{ direction: SwipeDirection }>('video/triggerSwipe');

export function SwipeableVideoPlayer({ currentVideo, metadata, isLoading }: SwipeableVideoPlayerProps) {
  const dispatch = useAppDispatch();
  
  // Shared values for gesture handling - these are animation-specific and don't belong in Redux
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isVerticalGesture = useSharedValue<boolean | null>(null);

  // Get all state from Redux
  const feedVideo = useAppSelector(selectCurrentVideo);
  const isCommentsVisible = useAppSelector(selectCommentsVisibility);
  const comments = useAppSelector(state => selectVideoComments(state, metadata.id));
  const isLoadingComments = useAppSelector(selectIsLoadingComments);
  const { isSwipeInProgress, lastSwipeTime } = useAppSelector(selectSwipeState);

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
      try {
        if (isVerticalGesture.value === null) {
          const absX = Math.abs(event.translationX);
          const absY = Math.abs(event.translationY);
          
          if (absX > DIRECTION_LOCK_THRESHOLD || absY > DIRECTION_LOCK_THRESHOLD) {
            isVerticalGesture.value = absY > absX;
          }
        }

        if (isVerticalGesture.value === true) {
          translateY.value = event.translationY;
          try {
            opacity.value = withTiming(Math.max(0.5, 1 - Math.abs(event.translationY) / VERTICAL_SWIPE_THRESHOLD * 0.5));
          } catch (error) {
            const safeErrorMessage = safeSerializeError(error);
            runOnJS(workletLogger.error)('Error in vertical timing animation', {
              errorMessage: safeErrorMessage,
              translationY: event.translationY.toString()
            });
          }
        } else if (isVerticalGesture.value === false) {
          translateX.value = event.translationX;
          try {
            opacity.value = withTiming(Math.max(0.5, 1 - Math.abs(event.translationX) / SWIPE_THRESHOLD * 0.5));
          } catch (error) {
            const safeErrorMessage = safeSerializeError(error);
            runOnJS(workletLogger.error)('Error in horizontal timing animation', {
              errorMessage: safeErrorMessage,
              translationX: event.translationX.toString()
            });
          }
        }
      } catch (error) {
        const safeErrorMessage = safeSerializeError(error);
        runOnJS(workletLogger.error)('Error in gesture onUpdate', {
          errorMessage: safeErrorMessage,
          translationX: event.translationX.toString(),
          translationY: event.translationY.toString(),
          isVerticalGesture: isVerticalGesture.value?.toString() ?? 'null'
        });
      }
    })
    .onEnd((event) => {
      'worklet';
      try {
        if (isVerticalGesture.value === true) {
          if (Math.abs(translateY.value) > VERTICAL_SWIPE_THRESHOLD) {
            const direction = translateY.value > 0 ? 'down' : 'up';
            const dispatchSwipe = () => dispatch(triggerSwipe({ direction }));
            runOnJS(dispatchSwipe)();
            
            try {
              translateY.value = withSpring(
                direction === 'down' ? height : -height,
                {
                  damping: 20,
                  stiffness: 90,
                }
              );
              translateX.value = withSpring(0);
              opacity.value = withTiming(0, { duration: 200 });
            } catch (error) {
              const safeErrorMessage = safeSerializeError(error);
              runOnJS(workletLogger.error)('Error in vertical swipe animation', {
                errorMessage: safeErrorMessage,
                direction,
                translationY: translateY.value.toString()
              });
            }
          } else {
            try {
              translateY.value = withSpring(0, {
                damping: 20,
                stiffness: 400,
              });
              opacity.value = withTiming(1, { duration: 200 });
            } catch (error) {
              const safeErrorMessage = safeSerializeError(error);
              runOnJS(workletLogger.error)('Error in vertical reset animation', {
                errorMessage: safeErrorMessage,
                translationY: translateY.value.toString()
              });
            }
          }
        } else if (isVerticalGesture.value === false) {
          if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
            const direction = translateX.value > 0 ? 'right' : 'left';
            const dispatchSwipe = () => dispatch(triggerSwipe({ direction }));
            runOnJS(dispatchSwipe)();
            
            try {
              translateX.value = withSpring(
                direction === 'right' ? width : -width,
                {
                  damping: 20,
                  stiffness: 90,
                }
              );
              translateY.value = withSpring(0);
              opacity.value = withTiming(0, { duration: 200 });
            } catch (error) {
              const safeErrorMessage = safeSerializeError(error);
              runOnJS(workletLogger.error)('Error in horizontal swipe animation', {
                errorMessage: safeErrorMessage,
                direction,
                translationX: translateX.value.toString()
              });
            }
          } else {
            try {
              translateX.value = withSpring(0, {
                damping: 20,
                stiffness: 400,
              });
              opacity.value = withTiming(1, { duration: 200 });
            } catch (error) {
              const safeErrorMessage = safeSerializeError(error);
              runOnJS(workletLogger.error)('Error in horizontal reset animation', {
                errorMessage: safeErrorMessage,
                translationX: translateX.value.toString()
              });
            }
          }
        } else {
          try {
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            opacity.value = withTiming(1);
          } catch (error) {
            const safeErrorMessage = safeSerializeError(error);
            runOnJS(workletLogger.error)('Error in neutral reset animation', {
              errorMessage: safeErrorMessage
            });
          }
        }
      } catch (error) {
        const safeErrorMessage = safeSerializeError(error);
        runOnJS(workletLogger.error)('Error in gesture onEnd', {
          errorMessage: safeErrorMessage,
          translationX: event.translationX.toString(),
          translationY: event.translationY.toString(),
          isVerticalGesture: isVerticalGesture.value?.toString() ?? 'null'
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    try {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value }
        ],
        opacity: opacity.value,
      };
    } catch (error) {
      const safeErrorMessage = safeSerializeError(error);
      runOnJS(workletLogger.error)('Error in animatedStyle worklet', {
        errorMessage: safeErrorMessage,
        translateX: translateX.value?.toString() ?? 'undefined',
        translateY: translateY.value?.toString() ?? 'undefined',
        opacity: opacity.value?.toString() ?? 'undefined'
      });
      // Return a safe fallback style
      return {
        transform: [
          { translateX: 0 },
          { translateY: 0 }
        ],
        opacity: 1,
      };
    }
  });

  if (!feedVideo) {
    logger.debug('No current video available');
    return null;
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <VideoPlayer
          video={feedVideo.video}
          metadata={feedVideo.metadata}
          shouldPlay={!isLoading}
        />
        <VideoOverlay metadata={feedVideo.metadata} />
        <CommentPanel videoId={metadata.id} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
}); 