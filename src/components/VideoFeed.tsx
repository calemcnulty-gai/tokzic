import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { VideoData } from '../services/video';
import { VideoMetadata } from '../types/firestore';
import { VideoPlayer } from './VideoPlayer';
import { createLogger } from '../utils/logger';
import { theme } from '../theme/theme';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  selectFeedState, 
  setActiveIndex, 
  selectCurrentVideo,
  selectPlaybackState
} from '../store/slices/videoSlice';

const logger = createLogger('VideoFeed');

interface VideoFeedProps {
  videos: VideoData[];
  metadata: Record<string, VideoMetadata>;
  currentIndex: number;
  onIndexChange?: (index: number) => void;
}

export function VideoFeed({
  videos,
  metadata,
  currentIndex,
  onIndexChange,
}: VideoFeedProps) {
  const dispatch = useAppDispatch();
  const { activeIndex } = useAppSelector(selectFeedState);
  const currentVideo = useAppSelector(selectCurrentVideo);
  const { isBuffering } = useAppSelector(selectPlaybackState);

  // Handle index changes
  React.useEffect(() => {
    if (currentIndex !== activeIndex) {
      dispatch(setActiveIndex(currentIndex));
      if (onIndexChange) {
        onIndexChange(currentIndex);
      }
    }
  }, [currentIndex, activeIndex, onIndexChange, dispatch]);

  if (!currentVideo) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoPlayer
        video={currentVideo.video}
        metadata={currentVideo.metadata}
        shouldPlay={!isBuffering}
      />
      {isBuffering && (
        <View style={[styles.loadingOverlay, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoContainer: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
}); 