import React, { useCallback } from 'react';
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
import { Video } from '../services/video';
import { VideoMetadata } from '../types/firestore';
import { createSwipe } from '../services/swipe';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.2;
const VERTICAL_SWIPE_THRESHOLD = height * 0.2;
const DIRECTION_LOCK_THRESHOLD = 10; // Pixels of movement before locking direction

interface SwipeableVideoPlayerProps {
  video: Video;
  metadata: VideoMetadata;
  shouldPlay?: boolean;
  onSwipeComplete?: () => void;
  onVerticalSwipe?: (direction: 'up' | 'down') => void;
  onSwipeProgress?: (progress: { x: number; y: number; percent: number }) => void;
}

export function SwipeableVideoPlayer({
  video,
  metadata,
  shouldPlay = false,
  onSwipeComplete,
  onVerticalSwipe,
  onSwipeProgress,
}: SwipeableVideoPlayerProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isVerticalGesture = useSharedValue<boolean | null>(null);

  const handleSwipeComplete = useCallback(async (direction: 'left' | 'right') => {
    try {
      await createSwipe(video.id, direction);
      console.log(`✅ Recorded ${direction} swipe for video ${video.id}`);
    } catch (error) {
      console.error('❌ Error recording swipe:', error);
    }
    onSwipeComplete?.();
  }, [video.id, onSwipeComplete]);

  const handleVerticalSwipe = useCallback((direction: 'up' | 'down') => {
    console.log(`🔄 Vertical swipe ${direction}`);
    onVerticalSwipe?.(direction);
  }, [onVerticalSwipe]);

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
      // If we haven't determined the gesture direction yet
      if (isVerticalGesture.value === null) {
        const absX = Math.abs(event.translationX);
        const absY = Math.abs(event.translationY);
        
        // Only lock in a direction if we've moved enough to be intentional
        if (absX > DIRECTION_LOCK_THRESHOLD || absY > DIRECTION_LOCK_THRESHOLD) {
          isVerticalGesture.value = absY > absX;
        }
      }

      // Once locked, only allow movement in that direction
      if (isVerticalGesture.value === true) {
        translateY.value = event.translationY;
        const progress = Math.abs(event.translationY) / VERTICAL_SWIPE_THRESHOLD;
        opacity.value = withTiming(Math.max(0.5, 1 - progress * 0.5));
        
        if (onSwipeProgress) {
          runOnJS(onSwipeProgress)({
            x: 0,
            y: event.translationY,
            percent: Math.min(progress, 1),
          });
        }
      } else if (isVerticalGesture.value === false) {
        translateX.value = event.translationX;
        const progress = Math.abs(event.translationX) / SWIPE_THRESHOLD;
        opacity.value = withTiming(Math.max(0.5, 1 - progress * 0.5));
        
        if (onSwipeProgress) {
          runOnJS(onSwipeProgress)({
            x: event.translationX,
            y: 0,
            percent: Math.min(progress, 1),
          });
        }
      }
    })
    .onEnd(() => {
      'worklet';
      if (isVerticalGesture.value === true) {
        if (Math.abs(translateY.value) > VERTICAL_SWIPE_THRESHOLD) {
          const direction = translateY.value > 0 ? 'down' : 'up';
          translateY.value = withSpring(
            direction === 'down' ? height : -height,
            {
              damping: 20,
              stiffness: 90,
            },
            (finished) => {
              if (finished) {
                runOnJS(handleVerticalSwipe)(direction);
              }
            }
          );
          translateX.value = withSpring(0);
          opacity.value = withTiming(0, { duration: 200 });
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
            },
            (finished) => {
              if (finished) {
                runOnJS(handleSwipeComplete)(direction);
              }
            }
          );
          translateY.value = withSpring(0);
          opacity.value = withTiming(0, { duration: 200 });
        } else {
          translateX.value = withSpring(0, {
            damping: 20,
            stiffness: 400,
          });
          opacity.value = withTiming(1, { duration: 200 });
        }
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
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <VideoPlayer
          video={video}
          metadata={metadata}
          shouldPlay={shouldPlay}
        />
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