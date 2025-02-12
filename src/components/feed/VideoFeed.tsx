import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import type { VideoData } from '../../types/video';
import { VideoMetadata } from '../../types/firestore';
import { VideoPlayer } from '../VideoPlayer';
import { createLogger } from '../../utils/logger';
import { theme } from '../../theme/theme';

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
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const isFirstRender = useRef(true);
  const mountTimeRef = useRef(Date.now());
  const lastIndexChangeTime = useRef(Date.now());

  useEffect(() => {
    if (isFirstRender.current) {
      logger.info('Component mounting', {
        mountTime: mountTimeRef.current,
        videosCount: videos.length,
        initialIndex: currentIndex
      });
      isFirstRender.current = false;
    }

    return () => {
      logger.info('Component unmounting', {
        totalMountDuration: Date.now() - mountTimeRef.current,
        finalIndex: activeIndex,
        totalVideos: videos.length
      });
    };
  }, [videos.length, currentIndex, activeIndex]);

  useEffect(() => {
    if (currentIndex !== activeIndex) {
      const timeSinceLastChange = Date.now() - lastIndexChangeTime.current;
      logger.debug('Index changed', {
        previousIndex: activeIndex,
        newIndex: currentIndex,
        timeSinceLastChange
      });
      
      setActiveIndex(currentIndex);
      lastIndexChangeTime.current = Date.now();
      
      if (onIndexChange) {
        onIndexChange(currentIndex);
      }
    }
  }, [currentIndex, activeIndex, onIndexChange]);

  useEffect(() => {
    logger.debug('Videos updated', {
      totalVideos: videos.length,
      hasMetadata: Object.keys(metadata).length === videos.length
    });
  }, [videos, metadata]);

  const handleIndexChange = (index: number) => {
    const timeSinceLastChange = Date.now() - lastIndexChangeTime.current;
    
    logger.debug('User changed index', {
      previousIndex: activeIndex,
      newIndex: index,
      timeSinceLastChange
    });
    
    setActiveIndex(index);
    lastIndexChangeTime.current = Date.now();
    
    if (onIndexChange) {
      onIndexChange(index);
    }
  };

  return (
    <View style={styles.container}>
      {videos.map((video, index) => (
        <View
          key={video.id}
          style={[
            styles.videoContainer,
            { display: index === activeIndex ? 'flex' : 'none' }
          ]}
        >
          <VideoPlayer
            video={video}
            metadata={metadata[video.id]}
            shouldPlay={index === activeIndex}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  videoContainer: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
}); 