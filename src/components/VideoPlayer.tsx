import React, { useCallback, useRef, memo } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { VideoData } from '../services/video';
import { VideoMetadata } from '../types/firestore';
import { createLogger } from '../utils/logger';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from '../store';
import {
  handlePlaybackStatusUpdate,
  togglePlayback,
  selectPlaybackState,
} from '../store/slices/videoSlice';
import { createAction } from '@reduxjs/toolkit';

const logger = createLogger('VideoPlayer');
const { width, height } = Dimensions.get('window');

interface VideoPlayerProps {
  video: VideoData;
  metadata: VideoMetadata;
  shouldPlay: boolean;
}

const updatePlaybackStatus = createAction<AVPlaybackStatus>('video/updatePlaybackStatus');

export const VideoPlayer = memo(function VideoPlayer({ video, metadata, shouldPlay }: VideoPlayerProps) {
  const videoRef = useRef<Video | null>(null);
  const dispatch = useAppDispatch() as ThunkDispatch<RootState, unknown, AnyAction>;

  // Get playback state from Redux
  const { isPlaying, isBuffering } = useAppSelector(selectPlaybackState);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    dispatch(updatePlaybackStatus(status));
  }, [dispatch]);

  const handleVideoPress = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      dispatch(togglePlayback());
      if (isPlaying) {
        logger.debug('Manually pausing video', { videoId: video.id });
        await videoRef.current.pauseAsync();
      } else {
        logger.debug('Manually playing video', { videoId: video.id });
        await videoRef.current.playAsync();
      }
    } catch (error) {
      logger.error('Error toggling play state', { 
        videoId: video.id,
        error,
        wasPlaying: isPlaying
      });
    }
  }, [video.id, isPlaying, dispatch]);

  // Update video ref when shouldPlay prop changes
  React.useEffect(() => {
    if (videoRef.current) {
      if (shouldPlay && !isPlaying) {
        logger.debug('Auto-playing video on mount/update', { videoId: video.id });
        videoRef.current.playAsync();
      } else if (!shouldPlay && isPlaying) {
        logger.debug('Pausing video on update', { videoId: video.id });
        videoRef.current.pauseAsync();
      }
    }
  }, [shouldPlay, isPlaying, video.id]);

  // Add initial play effect
  React.useEffect(() => {
    if (videoRef.current && shouldPlay) {
      logger.debug('Initial video autoplay', { videoId: video.id });
      videoRef.current.playAsync();
    }
  }, [video.id]); // Only run when video changes

  return (
    <TouchableWithoutFeedback onPress={handleVideoPress}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={{ uri: video.url }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={shouldPlay}
          isLooping
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoad={(status) => {
            logger.info('Video loaded', { 
              videoId: video.id,
              url: video.url,
              status
            });
            handlePlaybackStatusUpdate(status);
            // Auto-play on load if shouldPlay is true
            if (shouldPlay && videoRef.current) {
              videoRef.current.playAsync();
            }
          }}
          onError={(error) => {
            logger.error('Video loading error', { 
              videoId: video.id,
              url: video.url,
              error
            });
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.video.id === nextProps.video.id &&
    prevProps.shouldPlay === nextProps.shouldPlay
  );
});

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
}); 