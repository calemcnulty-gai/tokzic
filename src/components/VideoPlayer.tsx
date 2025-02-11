import React, { useCallback, useRef, memo } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { VideoData } from '../services/video';
import { VideoMetadata } from '../types/firestore';
import { createLogger } from '../utils/logger';
import { useAppDispatch, useAppSelector } from '../store/hooks';
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
  const dispatch = useAppDispatch();

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
        videoRef.current.playAsync();
      } else if (!shouldPlay && isPlaying) {
        videoRef.current.pauseAsync();
      }
    }
  }, [shouldPlay, isPlaying]);

  return (
    <TouchableWithoutFeedback onPress={handleVideoPress}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={{ uri: video.url }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isPlaying && shouldPlay}
          isLooping
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoad={(status) => {
            logger.info('Video loaded', { 
              videoId: video.id,
              url: video.url,
              status
            });
            handlePlaybackStatusUpdate(status);
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