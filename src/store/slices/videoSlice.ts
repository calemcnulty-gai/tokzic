import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VideoData, VideoWithMetadata, videoService } from '../../services/video';
import { VideoMetadata, Comment } from '../../types/firestore';
import { createLogger } from '../../utils/logger';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { 
  fetchVideoMetadata,
  fetchVideoComments,
  addVideoComment,
  toggleVideoLike,
  toggleVideoDislike,
  incrementVideoView
} from '../thunks/videoThunks';
import { createSwipe } from '../../services/swipe';
import { RootState } from '../../store';
import { SwipeDirection } from '../../components/SwipeableVideoPlayer';
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { createSelector } from '@reduxjs/toolkit';

const logger = createLogger('VideoSlice');

// Constants
const BUFFER_SIZE = 5;
const MIDDLE_INDEX = Math.floor(BUFFER_SIZE / 2);
const VIDEOS_PER_PAGE = 10;

interface LoadingState {
  isLoadingMetadata: boolean;
  isLoadingComments: boolean;
  isSubmittingComment: boolean;
  isTogglingLike: boolean;
  isTogglingDislike: boolean;
  isIncrementingView: boolean;
  isProcessingTip: boolean;
  isProcessingVideo: boolean;
}

interface VideoInteractionState {
  isLiked: boolean;
  isDisliked: boolean;
  comments: Comment[];
}

interface VideoPlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  position: number;
  duration: number;
  isBuffering: boolean;
}

interface VideoState {
  videos: VideoWithMetadata[];
  currentVideo: VideoWithMetadata | null;
  currentIndex: number;
  lastVisible: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
  isInitialized: boolean;
  loadingStates: LoadingState;
  error: string | null;
  errors: {
    metadata?: string;
    comments?: string;
    like?: string;
    dislike?: string;
    view?: string;
  };
  interactions: {
    [videoId: string]: VideoInteractionState;
  };
  swipeState: {
    isSwipeInProgress: boolean;
    lastSwipeTime: number;
  };
  player: VideoPlayerState;
  feed: {
    activeIndex: number;
    mountTime: number;
    lastIndexChangeTime: number;
  };
}

const initialState: VideoState = {
  videos: [],
  currentVideo: null,
  currentIndex: MIDDLE_INDEX,
  lastVisible: null,
  isLoading: false,
  isRefreshing: false,
  isAtStart: false,
  isAtEnd: false,
  isInitialized: false,
  loadingStates: {
    isLoadingMetadata: false,
    isLoadingComments: false,
    isSubmittingComment: false,
    isTogglingLike: false,
    isTogglingDislike: false,
    isIncrementingView: false,
    isProcessingTip: false,
    isProcessingVideo: false,
  },
  error: null,
  errors: {},
  interactions: {},
  swipeState: {
    isSwipeInProgress: false,
    lastSwipeTime: 0,
  },
  player: {
    isPlaying: true,
    isMuted: false,
    volume: 1,
    position: 0,
    duration: 0,
    isBuffering: false,
  },
  feed: {
    activeIndex: MIDDLE_INDEX,
    mountTime: Date.now(),
    lastIndexChangeTime: Date.now(),
  },
};

// Initialize video buffer with pagination support
export const initializeVideoBuffer = createAsyncThunk(
  'video/initialize',
  async () => {
    try {
      logger.info('Starting video buffer initialization');
      const result = await videoService.fetchVideos(BUFFER_SIZE);
      
      // Log raw video data for debugging
      logger.debug('Raw video data from service', {
        totalVideos: result.videos.length,
        videoDetails: result.videos.map(v => ({
          id: v.video.id,
          hasUrl: !!v.video.url,
          hasMetadata: !!v.metadata,
          metadataType: v.metadata ? typeof v.metadata : 'undefined',
          metadataFields: v.metadata ? Object.keys(v.metadata) : []
        }))
      });
      
      // Validate videos have Firebase Storage URLs
      const videosWithoutUrls = result.videos.filter(v => !v.video.url?.startsWith('https://firebasestorage.googleapis.com'));
      if (videosWithoutUrls.length > 0) {
        logger.error('Some videos are missing valid Firebase Storage URLs', {
          totalVideos: result.videos.length,
          invalidVideos: videosWithoutUrls.map(v => ({
            id: v.video.id,
            url: v.video.url,
            hasMetadata: !!v.metadata,
            metadataType: typeof v.metadata
          }))
        });
        throw new Error('Failed to initialize: some videos are missing valid Firebase Storage URLs');
      }
      
      // Validate metadata
      const videosWithInvalidMetadata = result.videos.filter(v => {
        if (!v.metadata) return true;
        if (typeof v.metadata === 'string') {
          try {
            const parsed = JSON.parse(v.metadata);
            return !parsed.id || !parsed.stats;
          } catch {
            return true;
          }
        }
        return !v.metadata.id || !v.metadata.stats;
      });
      
      if (videosWithInvalidMetadata.length > 0) {
        logger.error('Some videos have invalid metadata', {
          totalVideos: result.videos.length,
          invalidVideos: videosWithInvalidMetadata.map(v => ({
            id: v.video.id,
            metadataType: typeof v.metadata,
            rawMetadata: v.metadata
          }))
        });
        throw new Error('Failed to initialize: some videos have invalid metadata');
      }
      
      logger.info('Successfully initialized video buffer', { 
        videoCount: result.videos.length,
        hasLastVisible: !!result.lastVisible,
        videoIds: result.videos.map(v => v.video.id),
        urlsValid: result.videos.every(v => v.video.url?.startsWith('https://firebasestorage.googleapis.com')),
        metadataValid: result.videos.every(v => v.metadata && (!('stats' in v.metadata) || v.metadata.stats))
      });
      return result;
    } catch (error) {
      logger.error('Failed to initialize video buffer', { 
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
          cause: error.cause
        } : error,
        bufferSize: BUFFER_SIZE
      });
      throw error;
    }
  }
);

// Unified rotation with pagination and buffer management
export const rotateForward = createAsyncThunk(
  'video/rotateForward',
  async (_, { getState }) => {
    const state = getState() as { video: VideoState };
    const { videos, currentIndex, isAtEnd, lastVisible } = state.video;

    if (isAtEnd) return null;

    try {
      // If we're near the end of our buffer, fetch more videos
      if (currentIndex >= videos.length - 2) {
        if (!lastVisible) return { isAtEnd: true };
        
        logger.info('Fetching more videos for forward rotation');
        const result = await videoService.fetchVideos(VIDEOS_PER_PAGE, lastVisible);
        
        if (result.videos.length === 0) {
          return { isAtEnd: true };
        }

        return {
          type: 'append',
          videos: result.videos,
          lastVisible: result.lastVisible
        };
      }

      return { type: 'increment' };
    } catch (error) {
      logger.error('Failed to rotate forward', { error });
      throw error;
    }
  }
);

export const rotateBackward = createAsyncThunk(
  'video/rotateBackward',
  async (_, { getState }) => {
    const state = getState() as { video: VideoState };
    const { currentIndex, isAtStart, videos } = state.video;

    if (isAtStart || currentIndex <= 0) return null;

    try {
      // If we're near the start of our buffer, fetch previous videos
      if (currentIndex <= 2 && !isAtStart) {
        const firstVideo = videos[0].video;
        logger.info('Fetching previous videos for backward rotation');
        const prevVideos = await videoService.fetchVideosBefore(VIDEOS_PER_PAGE, firstVideo.id);
        
        if (prevVideos.length === 0) {
          return { isAtStart: true };
        }

        return {
          type: 'prepend',
          videos: prevVideos
        };
      }

      return { type: 'decrement' };
    } catch (error) {
      logger.error('Failed to rotate backward', { error });
      throw error;
    }
  }
);

export const refreshFeed = createAsyncThunk(
  'video/refresh',
  async () => {
    try {
      logger.info('Refreshing video feed');
      const result = await videoService.fetchVideos(VIDEOS_PER_PAGE);
      logger.info('Successfully refreshed feed', { videoCount: result.videos.length });
      return result;
    } catch (error) {
      logger.error('Failed to refresh feed', { error });
      throw error;
    }
  }
);

// New thunks for handling gestures and comments
export const handleSwipeGesture = createAsyncThunk(
  'video/handleSwipe',
  async ({ direction }: { direction: SwipeDirection }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { currentVideo } = state.video;
    
    if (!currentVideo || state.video.swipeState.isSwipeInProgress) {
      logger.warn('Swipe ignored', {
        videoId: currentVideo?.video.id,
        direction,
        reason: state.video.swipeState.isSwipeInProgress ? 'in progress' : 'no video'
      });
      return;
    }

    logger.info('Swipe gesture completed', {
      direction,
      videoId: currentVideo.video.id
    });

    try {
      if (direction === 'left' || direction === 'right') {
        await createSwipe(currentVideo.video.id, direction);
        logger.info('Recorded swipe', {
          videoId: currentVideo.video.id,
          direction
        });
      }

      if (direction === 'up') {
        dispatch(rotateForward());
      } else if (direction === 'down') {
        dispatch(rotateBackward());
      }
    } catch (error) {
      logger.error('Error handling swipe', {
        videoId: currentVideo.video.id,
        direction,
        error
      });
      throw error;
    }
  }
);

export const handleCommentSubmission = createAsyncThunk(
  'video/submitComment',
  async ({ text }: { text: string }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { user } = state.auth;
    const { currentVideo } = state.video;

    if (!user || !currentVideo) {
      logger.warn('Comment submission ignored', {
        reason: !user ? 'no user' : 'no video'
      });
      return;
    }

    try {
      await dispatch(addVideoComment({
        videoId: currentVideo.video.id,
        userId: user.uid,
        text,
        userInfo: {
          username: user.displayName || 'Anonymous',
          avatarUrl: user.photoURL || undefined,
        }
      })).unwrap();
    } catch (error) {
      logger.error('Error submitting comment', { error });
      throw error;
    }
  }
);

// Action creators for video likes/dislikes
export const handleVideoLike = createAsyncThunk(
  'video/handleLike',
  async ({ videoId }: { videoId: string }, { dispatch, getState }) => {
    const state = getState() as RootState;
    const { user } = state.auth;
    
    if (!user) {
      throw new Error('Must be logged in to like videos');
    }

    try {
      await dispatch(toggleVideoLike({ videoId, userId: user.uid })).unwrap();
    } catch (error) {
      logger.error('Error handling video like', { error });
      throw error;
    }
  }
);

export const handleVideoDislike = createAsyncThunk(
  'video/handleDislike',
  async ({ videoId }: { videoId: string }, { dispatch, getState }) => {
    const state = getState() as RootState;
    const { user } = state.auth;
    
    if (!user) {
      throw new Error('Must be logged in to dislike videos');
    }

    try {
      await dispatch(toggleVideoDislike({ videoId, userId: user.uid })).unwrap();
    } catch (error) {
      logger.error('Error handling video dislike', { error });
      throw error;
    }
  }
);

export const handlePlaybackStatusUpdate = createAsyncThunk(
  'video/handlePlaybackStatus',
  async (status: AVPlaybackStatus) => {
    if (!('isLoaded' in status)) {
      throw new Error('Video not loaded');
    }

    const loadedStatus = status as AVPlaybackStatusSuccess;
    return {
      isPlaying: loadedStatus.isPlaying,
      position: loadedStatus.positionMillis,
      duration: loadedStatus.durationMillis,
      isBuffering: loadedStatus.isBuffering,
      volume: loadedStatus.volume,
      isMuted: loadedStatus.isMuted,
    };
  }
);

export const togglePlayback = createAsyncThunk(
  'video/togglePlayback',
  async (_, { getState }) => {
    const state = getState() as RootState;
    return { isPlaying: !state.video.player.isPlaying };
  }
);

const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
      state.errors = {};
    },
    clearSpecificError(state, action: PayloadAction<keyof VideoState['errors']>) {
      if (state.errors[action.payload]) {
        delete state.errors[action.payload];
      }
    },
    initializeVideoInteractions(state, action: PayloadAction<{ videoId: string }>) {
      if (!state.interactions[action.payload.videoId]) {
        state.interactions[action.payload.videoId] = {
          isLiked: false,
          isDisliked: false,
          comments: []
        };
      }
    },
    setCurrentVideo: (state, action: PayloadAction<VideoWithMetadata>) => {
      state.currentVideo = action.payload;
    },
    setPlaying: (state, action: PayloadAction<boolean>) => {
      state.player.isPlaying = action.payload;
    },
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.player.isMuted = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.player.volume = action.payload;
    },
    setActiveIndex: (state, action: PayloadAction<number>) => {
      state.feed.activeIndex = action.payload;
    },
    logFeedUpdate: (state) => {
      state.feed.lastIndexChangeTime = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize
      .addCase(initializeVideoBuffer.pending, (state) => {
        logger.info('Video buffer initialization pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeVideoBuffer.fulfilled, (state, action) => {
        logger.info('Video buffer initialization fulfilled', {
          newVideosCount: action.payload.videos.length,
          firstVideoId: action.payload.videos[0]?.video.id,
          hasLastVisible: !!action.payload.lastVisible,
          currentIndex: state.currentIndex
        });
        state.videos = action.payload.videos;
        state.currentVideo = action.payload.videos[0] || null;
        state.lastVisible = action.payload.lastVisible;
        state.currentIndex = 0;
        state.isLoading = false;
        state.isAtStart = true;
        state.isInitialized = true;
        state.player.isPlaying = true;
      })
      .addCase(initializeVideoBuffer.rejected, (state, action) => {
        logger.error('Video buffer initialization rejected', {
          error: action.error.message,
          stack: action.error.stack
        });
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize video buffer';
      })

      // Rotate Forward
      .addCase(rotateForward.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rotateForward.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (!action.payload) return;

        if (action.payload.isAtEnd) {
          state.isAtEnd = true;
        } else if (action.payload.type === 'append' && action.payload.videos) {
          state.videos.push(...action.payload.videos);
          if (action.payload.lastVisible) {
            state.lastVisible = action.payload.lastVisible;
          }
          state.currentIndex++;
        } else if (action.payload.type === 'increment') {
          state.currentIndex++;
          state.isAtStart = false;
        }
      })
      .addCase(rotateForward.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to rotate forward';
      })

      // Rotate Backward
      .addCase(rotateBackward.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rotateBackward.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (!action.payload) return;

        if (action.payload.isAtStart) {
          state.isAtStart = true;
        } else if (action.payload.type === 'prepend' && action.payload.videos) {
          state.videos.unshift(...action.payload.videos);
          state.currentIndex += action.payload.videos.length;
        } else if (action.payload.type === 'decrement') {
          state.currentIndex--;
          state.isAtEnd = false;
        }
      })
      .addCase(rotateBackward.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to rotate backward';
      })

      // Refresh Feed
      .addCase(refreshFeed.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshFeed.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.videos = action.payload.videos;
        state.lastVisible = action.payload.lastVisible;
        state.currentIndex = 0;
        state.isAtStart = true;
        state.isAtEnd = false;
      })
      .addCase(refreshFeed.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.error.message || 'Failed to refresh feed';
      })

      // Fetch Video Metadata
      .addCase(fetchVideoMetadata.pending, (state) => {
        state.loadingStates.isLoadingMetadata = true;
        delete state.errors.metadata;
      })
      .addCase(fetchVideoMetadata.fulfilled, (state, action) => {
        state.loadingStates.isLoadingMetadata = false;
        const videoIndex = state.videos.findIndex(v => v.video.id === action.payload.id);
        if (videoIndex !== -1) {
          state.videos[videoIndex].metadata = action.payload;
        }
      })
      .addCase(fetchVideoMetadata.rejected, (state, action) => {
        state.loadingStates.isLoadingMetadata = false;
        state.errors.metadata = action.error.message || 'Failed to fetch video metadata';
      })

      // Fetch Video Comments
      .addCase(fetchVideoComments.pending, (state) => {
        state.loadingStates.isLoadingComments = true;
        delete state.errors.comments;
      })
      .addCase(fetchVideoComments.fulfilled, (state, action) => {
        state.loadingStates.isLoadingComments = false;
        if (!state.interactions[action.payload.videoId]) {
          state.interactions[action.payload.videoId] = {
            isLiked: false,
            isDisliked: false,
            comments: []
          };
        }
        state.interactions[action.payload.videoId].comments = action.payload.comments;
      })
      .addCase(fetchVideoComments.rejected, (state, action) => {
        state.loadingStates.isLoadingComments = false;
        state.errors.comments = action.error.message || 'Failed to fetch video comments';
      })

      // Add Video Comment
      .addCase(addVideoComment.pending, (state) => {
        state.loadingStates.isSubmittingComment = true;
        delete state.errors.comments;
      })
      .addCase(addVideoComment.fulfilled, (state, action) => {
        state.loadingStates.isSubmittingComment = false;
        if (!state.interactions[action.payload.videoId]) {
          state.interactions[action.payload.videoId] = {
            isLiked: false,
            isDisliked: false,
            comments: []
          };
        }
        state.interactions[action.payload.videoId].comments.unshift({
          id: Date.now().toString(),
          text: action.payload.text,
          userId: action.payload.userId,
          username: action.payload.userInfo.username,
          avatarUrl: action.payload.userInfo.avatarUrl,
          timestamp: Date.now(),
          videoId: action.payload.videoId
        } as Comment);
      })
      .addCase(addVideoComment.rejected, (state, action) => {
        state.loadingStates.isSubmittingComment = false;
        state.errors.comments = action.error.message || 'Failed to add comment';
      })

      // Toggle Video Like
      .addCase(toggleVideoLike.pending, (state) => {
        state.loadingStates.isTogglingLike = true;
        delete state.errors.like;
      })
      .addCase(toggleVideoLike.fulfilled, (state, action) => {
        state.loadingStates.isTogglingLike = false;
        if (!state.interactions[action.payload.videoId]) {
          state.interactions[action.payload.videoId] = {
            isLiked: false,
            isDisliked: false,
            comments: []
          };
        }
        state.interactions[action.payload.videoId].isLiked = action.payload.isLiked;
        if (action.payload.isLiked) {
          state.interactions[action.payload.videoId].isDisliked = false;
        }
      })
      .addCase(toggleVideoLike.rejected, (state, action) => {
        state.loadingStates.isTogglingLike = false;
        state.errors.like = action.error.message || 'Failed to toggle like';
      })

      // Toggle Video Dislike
      .addCase(toggleVideoDislike.pending, (state) => {
        state.loadingStates.isTogglingDislike = true;
        delete state.errors.dislike;
      })
      .addCase(toggleVideoDislike.fulfilled, (state, action) => {
        state.loadingStates.isTogglingDislike = false;
        if (!state.interactions[action.payload.videoId]) {
          state.interactions[action.payload.videoId] = {
            isLiked: false,
            isDisliked: false,
            comments: []
          };
        }
        state.interactions[action.payload.videoId].isDisliked = action.payload.isDisliked;
        if (action.payload.isDisliked) {
          state.interactions[action.payload.videoId].isLiked = false;
        }
      })
      .addCase(toggleVideoDislike.rejected, (state, action) => {
        state.loadingStates.isTogglingDislike = false;
        state.errors.dislike = action.error.message || 'Failed to toggle dislike';
      })

      // Increment Video View
      .addCase(incrementVideoView.pending, (state) => {
        state.loadingStates.isIncrementingView = true;
        delete state.errors.view;
      })
      .addCase(incrementVideoView.fulfilled, (state) => {
        state.loadingStates.isIncrementingView = false;
      })
      .addCase(incrementVideoView.rejected, (state, action) => {
        state.loadingStates.isIncrementingView = false;
        state.errors.view = action.error.message || 'Failed to increment view';
      })

      // Handle Swipe Gesture
      .addCase(handleSwipeGesture.pending, (state) => {
        state.swipeState.isSwipeInProgress = true;
        state.swipeState.lastSwipeTime = Date.now();
      })
      .addCase(handleSwipeGesture.fulfilled, (state) => {
        state.swipeState.isSwipeInProgress = false;
      })
      .addCase(handleSwipeGesture.rejected, (state) => {
        state.swipeState.isSwipeInProgress = false;
      })

      // Handle playback status update
      .addCase(handlePlaybackStatusUpdate.fulfilled, (state, action) => {
        state.player.isPlaying = action.payload.isPlaying ?? false;
        state.player.position = action.payload.position ?? 0;
        state.player.duration = action.payload.duration ?? 0;
        state.player.isBuffering = action.payload.isBuffering ?? false;
        state.player.volume = action.payload.volume ?? 1;
        state.player.isMuted = action.payload.isMuted ?? false;
      })
      .addCase(handlePlaybackStatusUpdate.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update playback status';
      })

      // Handle toggle playback
      .addCase(togglePlayback.fulfilled, (state, action) => {
        state.player.isPlaying = action.payload.isPlaying;
      });
  }
});

// Memoized base selectors
const selectVideoState = (state: RootState) => state.video;
const selectVideoInteractions = (state: RootState) => state.video.interactions;
const selectVideoPlayer = (state: RootState) => state.video.player;
const selectVideoFeed = (state: RootState) => state.video.feed;

// Memoized complex selectors
export const selectCurrentVideo = createSelector(
  [selectVideoState],
  (videoState) => videoState.currentVideo
);

export const selectVideoComments = createSelector(
  [selectVideoInteractions, (_, videoId: string) => videoId],
  (interactions, videoId) => interactions[videoId]?.comments || []
);

export const selectIsLoadingComments = createSelector(
  [selectVideoState],
  (videoState) => videoState.loadingStates.isLoadingComments
);

export const selectCommentsVisibility = createSelector(
  [(state: RootState) => state.ui],
  (ui) => ui.isCommentsVisible
);

export const selectSwipeState = createSelector(
  [selectVideoState],
  (videoState) => videoState.swipeState
);

export const selectVideoLikeStatus = createSelector(
  [selectVideoInteractions, (_, videoId: string) => videoId],
  (interactions, videoId) => ({
    isLiked: interactions[videoId]?.isLiked || false,
    isDisliked: interactions[videoId]?.isDisliked || false,
  })
);

export const selectIsProcessingLike = createSelector(
  [selectVideoState],
  (videoState) => videoState.loadingStates.isTogglingLike
);

export const selectIsProcessingTip = createSelector(
  [selectVideoState],
  (videoState) => videoState.loadingStates.isProcessingTip
);

export const selectPlaybackState = createSelector(
  [selectVideoPlayer],
  (player) => ({
    isPlaying: player.isPlaying,
    isMuted: player.isMuted,
    volume: player.volume,
    position: player.position,
    duration: player.duration,
    isBuffering: player.isBuffering,
  })
);

export const selectFeedState = createSelector(
  [selectVideoFeed],
  (feed) => ({
    activeIndex: feed.activeIndex,
    mountTime: feed.mountTime,
    lastIndexChangeTime: feed.lastIndexChangeTime,
  })
);

export const {
  clearError,
  clearSpecificError,
  initializeVideoInteractions,
  setCurrentVideo,
  setPlaying,
  setMuted,
  setVolume,
  setActiveIndex,
  logFeedUpdate,
} = videoSlice.actions;

export default videoSlice.reducer; 