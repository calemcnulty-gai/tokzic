import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SwipeableVideoPlayer } from '../../components/SwipeableVideoPlayer';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { createLogger } from '../../utils/logger';
import { initializeVideoBuffer } from '../../store/slices/videoSlice';
import { VideoWithMetadata } from '../../types/video';

const logger = createLogger('FeedScreen');

type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function FeedScreen() {
  const { 
    isAuthenticated,
    isInitialized: authInitialized,
    loadingStates: authLoadingStates,
    user,
    errors: authErrors
  } = useAuth();
  
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const dispatch = useAppDispatch();
  
  const { 
    videos, 
    currentIndex, 
    isLoading, 
    error, 
    isInitialized: videoInitialized,
    loadingStates 
  } = useAppSelector((state) => state.video);

  useEffect(() => {
    async function initializeFeed() {
      if (!authInitialized || authLoadingStates.isInitializing || !isAuthenticated) {
        logger.info('Not ready to initialize feed', {
          authInitialized,
          authLoadingStates,
          isAuthenticated
        });
        return;
      }

      // Prevent duplicate calls by checking if we're already loading or if there's an error
      if (!videoInitialized && !isLoading && !error) {
        logger.info('Initializing video feed', { userId: user?.uid });
        try {
          const result = await dispatch(initializeVideoBuffer()).unwrap();
          logger.info('Video feed initialized successfully', {
            videoCount: result?.videos?.length ?? 0,
            hasLastVisible: !!result?.lastVisible,
            firstVideoId: result?.videos?.[0]?.video?.id,
            hasValidUrls: result?.videos?.every((v: VideoWithMetadata) => v.video?.url?.startsWith('https://firebasestorage.googleapis.com'))
          });
        } catch (error) {
          logger.error('Failed to initialize video feed', { 
            error: error instanceof Error ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
              cause: error.cause
            } : error,
            state: {
              videoCount: videos.length,
              currentIndex,
              isLoading,
              videoInitialized,
              hasError: !!error
            }
          });
        }
      }
    }

    initializeFeed();
  }, [
    authInitialized,
    authLoadingStates.isInitializing,
    isAuthenticated,
    user,
    dispatch,
    videoInitialized,
    isLoading,
    videos.length,
    currentIndex,
    error
  ]);

  // If not authenticated, redirect to auth screen
  if (authInitialized && !isAuthenticated) {
    logger.info('Not authenticated, redirecting to auth');
    navigation.replace('AuthStack');
    return null;
  }

  // Show loading state while initializing
  if (!authInitialized || authLoadingStates.isInitializing || isLoading) {
    logger.debug('Showing loading state', {
      authInitialized,
      authLoadingStates,
      isLoading,
      videoCount: videos.length
    });
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Show auth errors if any
  if (authErrors.signIn || authErrors.signUp) {
    logger.error('Auth error state', { authErrors });
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {authErrors.signIn || authErrors.signUp}
        </Text>
      </View>
    );
  }

  // Show video errors if any
  if (error) {
    logger.error('Video error state', { 
      error,
      videoCount: videos.length,
      currentIndex,
      isLoading
    });
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Show empty state if no videos
  if (!videos.length) {
    logger.warn('No videos available', {
      videoCount: videos.length,
      isLoading,
      error,
      videoInitialized
    });
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No videos available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SwipeableVideoPlayer
        currentVideo={videos[currentIndex]}
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