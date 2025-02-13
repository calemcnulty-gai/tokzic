import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectVideoState,
  selectVideoLoadingStates,
  selectVideoPlayer,
  selectVideoFeed,
  selectCurrentVideo,
  initializeVideoBuffer,
  rotateForward,
  rotateBackward,
  refreshFeed,
  handleSwipeGesture,
  handlePlaybackStatusUpdate,
  togglePlayback,
  setPlaying,
  setMuted,
  setVolume
} from '../store/slices/videoSlice';
import { useLoadingState } from './useLoadingState';
import type { LoadingState } from '../types/state';
import type { VideoWithMetadata } from '../types/video';
import type { SwipeDirection } from '../components/SwipeableVideoPlayer';
import type { AVPlaybackStatus } from 'expo-av';

interface UseVideoResult extends LoadingState {
  // Video state
  currentVideo: VideoWithMetadata | null;
  loadingStates: {
    metadata: LoadingState;
    comments: LoadingState;
    likes: LoadingState;
    tips: LoadingState;
    video: LoadingState;
  };
  
  // Player state
  player: {
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    position: number;
    duration: number;
    isBuffering: boolean;
  };

  // Feed state
  feed: {
    activeIndex: number;
    mountTime: number;
    lastIndexChangeTime: number;
  };

  // Actions
  rotateForward: () => Promise<void>;
  rotateBackward: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  handleSwipe: (direction: SwipeDirection) => Promise<void>;
  updatePlaybackStatus: (status: AVPlaybackStatus) => Promise<void>;
  togglePlayback: () => Promise<void>;
  setPlaying: (isPlaying: boolean) => void;
  setMuted: (isMuted: boolean) => void;
  setVolume: (volume: number) => void;
}

export function useVideo(): UseVideoResult {
  const dispatch = useDispatch();
  const videoState = useSelector(selectVideoState);
  const loadingStates = useSelector(selectVideoLoadingStates);
  const player = useSelector(selectVideoPlayer);
  const feed = useSelector(selectVideoFeed);
  const currentVideo = useSelector(selectCurrentVideo);

  const load = useCallback(() => {
    dispatch(initializeVideoBuffer());
  }, [dispatch]);

  // Use the standard loading state pattern
  const loadingState = useLoadingState(videoState, load);

  // Video actions
  const handleRotateForward = useCallback(async () => {
    await dispatch(rotateForward());
  }, [dispatch]);

  const handleRotateBackward = useCallback(async () => {
    await dispatch(rotateBackward());
  }, [dispatch]);

  const handleRefreshFeed = useCallback(async () => {
    await dispatch(refreshFeed());
  }, [dispatch]);

  const handleSwipeAction = useCallback(async (direction: SwipeDirection) => {
    await dispatch(handleSwipeGesture({ direction }));
  }, [dispatch]);

  const handlePlaybackStatusUpdate = useCallback(async (status: AVPlaybackStatus) => {
    await dispatch(handlePlaybackStatusUpdate(status));
  }, [dispatch]);

  const handleTogglePlayback = useCallback(async () => {
    await dispatch(togglePlayback());
  }, [dispatch]);

  const handleSetPlaying = useCallback((isPlaying: boolean) => {
    dispatch(setPlaying(isPlaying));
  }, [dispatch]);

  const handleSetMuted = useCallback((isMuted: boolean) => {
    dispatch(setMuted(isMuted));
  }, [dispatch]);

  const handleSetVolume = useCallback((volume: number) => {
    dispatch(setVolume(volume));
  }, [dispatch]);

  return {
    ...loadingState,
    currentVideo,
    loadingStates,
    player,
    feed,
    rotateForward: handleRotateForward,
    rotateBackward: handleRotateBackward,
    refreshFeed: handleRefreshFeed,
    handleSwipe: handleSwipeAction,
    updatePlaybackStatus: handlePlaybackStatusUpdate,
    togglePlayback: handleTogglePlayback,
    setPlaying: handleSetPlaying,
    setMuted: handleSetMuted,
    setVolume: handleSetVolume,
  };
} 