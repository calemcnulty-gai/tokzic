import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Dimensions, Text } from 'react-native';
import { SwipeableVideoPlayer } from '../../components/SwipeableVideoPlayer';
import { Video, fetchVideos } from '../../services/video';
import { VideoMetadata } from '../../types/firestore';
import { fetchVideosMetadata } from '../../services/video-metadata';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const windowHeight = Dimensions.get('window').height;

type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface VideoWithMetadata {
  video: Video;
  metadata: VideoMetadata;
}

export function FeedScreen() {
  const [videos, setVideos] = useState<VideoWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to auth screen if not authenticated
        navigation.replace('Auth');
        return;
      } else {
        loadVideos();
      }
    }
  }, [user, authLoading, navigation]);

  const loadVideos = async () => {
    console.log('📥 Starting to fetch videos...');
    setError(null);
    setLoading(true);
    
    try {
      // TODO: REMOVE AFTER DEMO - Loading all videos at startup
      // This should be replaced with proper pagination and preloading strategy
      const fetchedVideos = await fetchVideos();
      console.log(`✅ Successfully fetched ${fetchedVideos.length} videos`);

      if (fetchedVideos.length === 0) {
        setError('No videos available');
        return;
      }

      // Fetch metadata for all videos at once
      // TODO: REMOVE AFTER DEMO - This should be paginated and preloaded
      const metadata = await fetchVideosMetadata(fetchedVideos.map(v => v.id));
      console.log(`✅ Successfully fetched metadata for ${metadata.length} videos`);

      // Combine videos with their metadata and preload all videos
      const videosWithMetadata = fetchedVideos.map(video => ({
        video: {
          ...video,
          // TODO: REMOVE AFTER DEMO - Force video preloading by setting shouldPreload
          shouldPreload: true,
        },
        metadata: metadata.find(m => m.id === video.id) || {
          id: video.id,
          title: 'Untitled',
          description: '',
          createdAt: Date.now(),
          creatorId: 'unknown',
          creator: {
            username: 'Anonymous',
          },
          stats: {
            views: 0,
            likes: 0,
            superLikes: 0,
            dislikes: 0,
            superDislikes: 0,
            comments: 0,
            tips: 0,
          },
        },
      }));

      setVideos(videosWithMetadata);
    } catch (error) {
      console.error('❌ Error loading videos:', error);
      if (error instanceof Error && error.message.includes('must be authenticated')) {
        navigation.replace('Auth');
      } else {
        setError('Failed to load videos. Please try again.');
      }
    } finally {
      setLoading(false);
      console.log('🔄 Loading state set to false');
    }
  };

  const renderItem = ({ item, index }: { item: VideoWithMetadata; index: number }) => {
    console.log(`🎥 Rendering video ${item.video.id} at index ${index}`);
    // Consider a video "active" if it's the current one, the next one, or the previous one
    const isActive = Math.abs(index - currentIndex) <= 1;

    // TODO: REMOVE AFTER DEMO - Temporary infinite scroll for demonstration purposes
    // This should be replaced with proper pagination and video loading
    const handleScrollToIndex = (targetIndex: number) => {
      // Handle infinite scroll wrapping
      let wrappedIndex = targetIndex;
      if (targetIndex >= videos.length) {
        wrappedIndex = 0;
      } else if (targetIndex < 0) {
        wrappedIndex = videos.length - 1;
      }

      console.log(`🔄 Scrolling to index ${wrappedIndex} (wrapped from ${targetIndex})`);
      flatListRef.current?.scrollToIndex({ 
        index: wrappedIndex, 
        animated: true,
        viewPosition: 0
      });
    };

    return (
      <SwipeableVideoPlayer
        video={item.video}
        metadata={item.metadata}
        shouldPlay={index === currentIndex}
        onSwipeComplete={() => {
          // Automatically scroll to next video after swipe
          handleScrollToIndex(index + 1);
        }}
        onVerticalSwipe={(direction) => {
          const targetIndex = direction === 'up' ? index + 1 : index - 1;
          handleScrollToIndex(targetIndex);
        }}
        onSwipeProgress={(progress) => {
          // If we're swiping up
          if (progress.y < 0) {
            if (progress.percent > 0.3) {
              handleScrollToIndex(index + 1);
            }
          }
          // If we're swiping down
          else if (progress.y > 0) {
            if (progress.percent > 0.3) {
              handleScrollToIndex(index - 1);
            }
          }
        }}
      />
    );
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / windowHeight);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  if (loading || authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={item => item.video.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        getItemLayout={(_, index) => ({
          length: windowHeight,
          offset: windowHeight * index,
          index,
        })}
        snapToInterval={windowHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        onMomentumScrollEnd={handleScroll}
        // Performance optimizations
        windowSize={5} // Keep 5 items in memory (2 before, 1 current, 2 after)
        maxToRenderPerBatch={3} // Render 3 items per batch
        initialNumToRender={2} // Initially render 2 items
        removeClippedSubviews={false} // Keep views in memory
        updateCellsBatchingPeriod={30} // Update cells more frequently
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
}); 