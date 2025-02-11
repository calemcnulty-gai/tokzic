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

const logger = createLogger('FeedScreen');

type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function FeedScreen() {
  const { loading: authLoading, isInitialized: authInitialized, user } = useAuth();
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const dispatch = useAppDispatch();
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

      if (!videoInitialized) {
        logger.info('Initializing video feed', { userId: user.uid });
        try {
          await dispatch(initializeVideoBuffer()).unwrap();
          logger.info('Video feed initialized successfully');
        } catch (error) {
          logger.error('Failed to initialize video feed', { error });
        }
      } else {
        logger.info('Video feed already initialized', { videoCount: videos.length });
      }
    }

    initializeFeed();
  }, [authInitialized, authLoading, user, dispatch, videoInitialized]);

  // If not authenticated, redirect to auth screen
  if (authInitialized && !user) {
    logger.info('No user found, redirecting to auth');
    navigation.replace('Auth');
    return null;
  }

  if (!authInitialized || authLoading || isLoading) {
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

  if (!videos.length) {
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