import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SwipeableVideoPlayer } from '../../components/SwipeableVideoPlayer';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../store/hooks';
import { createLogger } from '../../utils/logger';
import { initializeVideoBuffer } from '../../store/slices/videoSlice';
import { VideoWithMetadata } from '../../services/video';
import { useDispatch } from 'react-redux';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from '../../store';

const logger = createLogger('FeedScreen');

type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function FeedScreen() {
  const { loading: authLoading, isInitialized: authInitialized, user } = useAuth();
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, AnyAction>>();
  const { videos, currentIndex, isLoading, error, isInitialized: videoInitialized } = useAppSelector(state => state.video);

  useEffect(() => {
    async function initializeFeed() {
      if (!authInitialized || authLoading || !user) {
        logger.info('Not ready to initialize feed', {
          authInitialized,
          authLoading,
          hasUser: !!user
        });
        return;
      }

      // Prevent duplicate calls by checking if we're already loading
      if (!videoInitialized && !isLoading) {
        logger.info('Initializing video feed', { userId: user.uid });
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
      } else {
        logger.info('Video feed already initialized or currently loading', { 
          videoCount: videos.length,
          currentIndex,
          isLoading,
          videoInitialized,
          hasError: !!error
        });
      }
    }

    initializeFeed();
  }, [authInitialized, authLoading, user, dispatch, videoInitialized, isLoading, videos.length, currentIndex, error]);

  // If not authenticated, redirect to auth screen
  if (authInitialized && !user) {
    logger.info('No user found, redirecting to auth');
    navigation.replace('AuthStack');
    return null;
  }

  if (!authInitialized || authLoading || isLoading) {
    logger.debug('Showing loading state', {
      authInitialized,
      authLoading,
      isLoading,
      videoCount: videos.length
    });
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    logger.error('Rendering error state', { 
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
        currentVideo={videos[currentIndex].video}
        metadata={videos[currentIndex].metadata}
        isLoading={isLoading}
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