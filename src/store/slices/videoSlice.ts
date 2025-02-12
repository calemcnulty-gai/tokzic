import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { videoService } from '../../services/video';
import { VideoWithMetadata } from '../../types/video';
import { VideoMetadata, Comment } from '../../types/firestore';
import { createLogger } from '../../utils/logger';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { 
  fetchVideoMetadata as fetchVideoMetadataThunk,
  fetchVideoComments as fetchVideoCommentsThunk,
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
import {
  toggleLike as toggleLikeThunk,
  fetchVideoLikes as fetchVideoLikesThunk,
  fetchVideoTips as fetchVideoTipsThunk
} from '../slices/firebase/thunks/firestoreThunks';
import { selectUser } from '../slices/firebase/selectors';
import { AppDispatch } from '../../store';
import { ThunkDispatch, AnyAction } from '@reduxjs/toolkit';

const logger = createLogger('VideoSlice');

// Constants
const BUFFER_SIZE = 5;
const MIDDLE_INDEX = Math.floor(BUFFER_SIZE / 2);
const VIDEOS_PER_PAGE = 10;

interface LoadingState {
  isLoading: boolean;  // Currently loading
  isLoaded: boolean;   // Successfully loaded
  error: string | null // Any error that occurred
}

interface VideoLoadingStates {
  metadata: LoadingState;
  comments: LoadingState;
  likes: LoadingState;
  tips: LoadingState;
  video: LoadingState;
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

interface VideoState extends LoadingState {
  videos: VideoWithMetadata[];
  currentVideo: VideoWithMetadata | null;
  currentIndex: number;
  lastVisible: QueryDocumentSnapshot<DocumentData, DocumentData> | null;
  isRefreshing: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
  isInitialized: boolean;
  isVideosLoaded: boolean;  // New flag to track if videos are loaded
  isMetadataLoaded: boolean;  // New flag to track if metadata is loaded
  loadingStates: VideoLoadingStates;
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
  // LoadingState
  isLoading: false,
  isLoaded: false,
  error: null,
  
  // Video specific state
  videos: [],
  currentVideo: null,
  currentIndex: 0,
  lastVisible: null,
  isRefreshing: false,
  isAtStart: false,
  isAtEnd: false,
  isInitialized: false,
  isVideosLoaded: false,
  isMetadataLoaded: false,
  loadingStates: {
    metadata: { isLoading: false, isLoaded: false, error: null },
    comments: { isLoading: false, isLoaded: false, error: null },
    likes: { isLoading: false, isLoaded: false, error: null },
    tips: { isLoading: false, isLoaded: false, error: null },
    video: { isLoading: false, isLoaded: false, error: null }
  },
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
    activeIndex: 0,
    mountTime: Date.now(),
    lastIndexChangeTime: Date.now(),
  },
};

// Initialize video buffer with pagination support
export const initializeVideoBuffer = createAsyncThunk(
  'video/initialize',
  async (_, { dispatch, getState }) => {
    try {
      logger.info('Starting video buffer initialization');
      const result = await videoService.fetchVideos(BUFFER_SIZE);
      
      // Enhanced logging for video data
      logger.debug('Raw video data from service', {
        totalVideos: result.videos.length,
        videoDetails: result.videos.map(v => ({
          id: v.video.id,
          url: v.video.url,
          hasUrl: !!v.video.url,
          hasMetadata: !!v.metadata,
          metadataFields: v.metadata ? Object.keys(v.metadata) : [],
          metadataContent: v.metadata
        })),
        lastVisible: result.lastVisible ? {
          id: result.lastVisible.id,
          exists: result.lastVisible.exists(),
          data: result.lastVisible.data()
        } : null,
        hasMore: result.hasMore
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

    logger.info('Attempting to rotate forward', {
      currentIndex,
      totalVideos: videos.length,
      isAtEnd,
      hasLastVisible: !!lastVisible,
      currentVideoId: videos[currentIndex]?.video?.id,
      nextVideoId: videos[currentIndex + 1]?.video?.id
    });

    if (isAtEnd) {
      logger.warn('Cannot rotate forward - at end of feed');
      return null;
    }

    try {
      // If we're near the end of our buffer, fetch more videos
      if (currentIndex >= videos.length - 2) {
        if (!lastVisible) {
          logger.warn('No lastVisible document for pagination', {
            currentIndex,
            videosLength: videos.length
          });
          return { isAtEnd: true };
        }
        
        logger.info('Fetching more videos for forward rotation', {
          currentIndex,
          videosLength: videos.length,
          lastVisibleId: lastVisible.id
        });
        const result = await videoService.fetchVideos(VIDEOS_PER_PAGE, lastVisible);
        
        if (result.videos.length === 0) {
          logger.warn('No more videos available', {
            currentIndex,
            totalExisting: videos.length
          });
          return { isAtEnd: true };
        }

        logger.info('Successfully fetched more videos', {
          fetchedCount: result.videos.length,
          newLastVisibleId: result.lastVisible?.id,
          hasMore: result.hasMore,
          firstNewVideoId: result.videos[0]?.video?.id,
          lastNewVideoId: result.videos[result.videos.length - 1]?.video?.id
        });

        return {
          type: 'append',
          videos: result.videos,
          lastVisible: result.lastVisible
        };
      }

      logger.info('Incrementing video index', {
        currentIndex,
        nextIndex: currentIndex + 1,
        nextVideoId: videos[currentIndex + 1]?.video?.id,
        nextVideoUrl: videos[currentIndex + 1]?.video?.url
      });
      return { type: 'increment' };
    } catch (error) {
      logger.error('Failed to rotate forward', { 
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error,
        currentIndex,
        videosLength: videos.length,
        currentVideoId: videos[currentIndex]?.video?.id
      });
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
    const gestureState = state.gesture;
    
    logger.info('Starting swipe gesture handling', {
      direction,
      currentIndex: state.video.currentIndex,
      totalVideos: state.video.videos.length,
      currentVideoId: currentVideo?.video.id,
      swipeInProgress: state.video.swipeState.isSwipeInProgress,
      isAtStart: state.video.isAtStart,
      isAtEnd: state.video.isAtEnd,
      gestureState: {
        isEnabled: gestureState.isSwipeEnabled,
        inProgress: gestureState.gestureInProgress,
        timeSinceLastGesture: Date.now() - gestureState.lastGestureTimestamp
      }
    });
    
    if (!currentVideo) {
      logger.warn('Swipe ignored - no current video');
      return;
    }

    try {
      if (direction === 'left' || direction === 'right') {
        logger.debug('Processing horizontal swipe', { 
          direction,
          videoId: currentVideo.video.id,
          currentIndex: state.video.currentIndex,
          gestureTimestamp: gestureState.lastGestureTimestamp
        });
        await createSwipe(currentVideo.video.id, direction);
        logger.info('Recorded swipe', {
          videoId: currentVideo.video.id,
          direction,
          duration: Date.now() - gestureState.lastGestureTimestamp
        });
      }

      if (direction === 'up') {
        logger.debug('Processing vertical swipe up', {
          currentIndex: state.video.currentIndex,
          videoId: currentVideo.video.id,
          gestureTimestamp: gestureState.lastGestureTimestamp
        });
        await dispatch(rotateForward()).unwrap();
        logger.info('Completed forward rotation after up swipe', {
          newIndex: (getState() as RootState).video.currentIndex,
          duration: Date.now() - gestureState.lastGestureTimestamp,
          success: true
        });
      } else if (direction === 'down') {
        logger.debug('Processing vertical swipe down', {
          currentIndex: state.video.currentIndex,
          videoId: currentVideo.video.id,
          gestureTimestamp: gestureState.lastGestureTimestamp
        });
        await dispatch(rotateBackward()).unwrap();
        logger.info('Completed backward rotation after down swipe', {
          newIndex: (getState() as RootState).video.currentIndex,
          duration: Date.now() - gestureState.lastGestureTimestamp,
          success: true
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Error handling swipe', {
        videoId: currentVideo.video.id,
        direction,
        gestureState: {
          isEnabled: gestureState.isSwipeEnabled,
          inProgress: gestureState.gestureInProgress,
          timeSinceLastGesture: Date.now() - gestureState.lastGestureTimestamp
        },
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      throw error;
    }
  }
);

export const handleCommentSubmission = createAsyncThunk(
  'video/submitComment',
  async ({ text }: { text: string }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const user = selectUser(state);
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
    const user = selectUser(state);
    
    if (!user) {
      throw new Error('Must be logged in to like videos');
    }

    try {
      const result = await (dispatch as any)(toggleLikeThunk({ videoId, userId: user.uid }));
      await result.unwrap();
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
    const user = selectUser(state);
    
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
    triggerSwipe: (state, action: PayloadAction<{ direction: SwipeDirection }>) => {
      logger.info('Swipe action received in slice', {
        direction: action.payload.direction,
        currentIndex: state.currentIndex,
        currentVideoId: state.currentVideo?.video.id,
        totalVideos: state.videos.length
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize
      .addCase(initializeVideoBuffer.pending, (state) => {
        logger.info('Video buffer initialization pending', {
          currentState: {
            isLoading: state.isLoading,
            isVideosLoaded: state.isVideosLoaded,
            isMetadataLoaded: state.isMetadataLoaded,
            currentIndex: state.currentIndex,
            videoCount: state.videos.length
          }
        });
        state.isLoading = true;
        state.isVideosLoaded = false;
        state.isMetadataLoaded = false;
        state.error = null;
      })
      .addCase(initializeVideoBuffer.fulfilled, (state, action) => {
        logger.info('Video buffer initialization fulfilled', {
          newVideos: action.payload.videos.map(v => ({
            id: v.video.id,
            url: v.video.url,
            hasMetadata: !!v.metadata,
            metadataFields: v.metadata ? Object.keys(v.metadata) : []
          })),
          lastVisible: action.payload.lastVisible ? {
            id: action.payload.lastVisible.id,
            exists: action.payload.lastVisible.exists()
          } : null,
          hasMore: action.payload.hasMore
        });
        
        // Ensure we have videos before proceeding
        if (!action.payload.videos.length) {
          logger.warn('No videos returned during initialization');
          state.videos = [];
          state.currentVideo = null;
          state.currentIndex = 0;
          state.isLoading = false;
          state.isAtStart = true;
          state.isInitialized = true;
          state.isVideosLoaded = true;
          state.isMetadataLoaded = true;
          state.player.isPlaying = false;
          return;
        }

        // Set videos and ensure currentVideo is properly initialized
        state.videos = action.payload.videos;
        state.currentVideo = action.payload.videos[0];
        state.lastVisible = action.payload.lastVisible;
        state.currentIndex = 0;
        state.isLoading = false;
        state.isAtStart = true;
        state.isInitialized = true;
        state.isVideosLoaded = true;
        state.isMetadataLoaded = true;
        state.player.isPlaying = true;

        // Initialize interactions for the current video
        if (state.currentVideo) {
          const videoId = state.currentVideo.video.id;
          if (!state.interactions[videoId]) {
            state.interactions[videoId] = {
              isLiked: false,
              isDisliked: false,
              comments: []
            };
          }
        }
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
        logger.info('Starting forward rotation', {
          currentIndex: state.currentIndex,
          totalVideos: state.videos.length,
          currentVideoId: state.currentVideo?.video.id
        });
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rotateForward.fulfilled, (state, action) => {
        if (!action.payload) {
          logger.warn('Forward rotation cancelled - no payload');
          state.isLoading = false;
          return;
        }

        if (action.payload.isAtEnd) {
          logger.info('Reached end of feed');
          state.isAtEnd = true;
        } else if (action.payload.type === 'append' && action.payload.videos) {
          logger.info('Appending new videos', {
            newVideos: action.payload.videos.map(v => ({
              id: v.video.id,
              url: v.video.url,
              hasMetadata: !!v.metadata
            })),
            newLastVisibleId: action.payload.lastVisible?.id
          });
          state.videos.push(...action.payload.videos);
          if (action.payload.lastVisible) {
            state.lastVisible = action.payload.lastVisible;
          }
          state.currentIndex++;
          state.currentVideo = state.videos[state.currentIndex];
          // Reset player state for new video
          state.player.isPlaying = true;
          state.player.position = 0;
        } else if (action.payload.type === 'increment') {
          logger.info('Incrementing video index', {
            oldIndex: state.currentIndex,
            newIndex: state.currentIndex + 1,
            nextVideoId: state.videos[state.currentIndex + 1]?.video.id
          });
          state.currentIndex++;
          state.isAtStart = false;
          state.currentVideo = state.videos[state.currentIndex];
          // Reset player state for new video
          state.player.isPlaying = true;
          state.player.position = 0;
        }
        
        state.isLoading = false;
      })
      .addCase(rotateForward.rejected, (state, action) => {
        logger.error('Forward rotation failed', {
          error: action.error.message,
          currentIndex: state.currentIndex,
          totalVideos: state.videos.length
        });
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
      .addCase(fetchVideoMetadataThunk.pending, (state) => {
        state.loadingStates.metadata.isLoading = true;
        delete state.errors.metadata;
      })
      .addCase(fetchVideoMetadataThunk.fulfilled, (state, action) => {
        state.loadingStates.metadata.isLoading = false;
        state.loadingStates.metadata.isLoaded = true;
        const videoIndex = state.videos.findIndex(v => v.video.id === action.payload.id);
        if (videoIndex !== -1) {
          state.videos[videoIndex].metadata = action.payload;
        }
      })
      .addCase(fetchVideoMetadataThunk.rejected, (state, action) => {
        state.loadingStates.metadata.isLoading = false;
        state.loadingStates.metadata.isLoaded = false;
        state.errors.metadata = action.error.message || 'Failed to fetch video metadata';
      })

      // Fetch Video Comments
      .addCase(fetchVideoCommentsThunk.pending, (state) => {
        state.loadingStates.comments.isLoading = true;
        delete state.errors.comments;
      })
      .addCase(fetchVideoCommentsThunk.fulfilled, (state, action) => {
        state.loadingStates.comments.isLoading = false;
        state.loadingStates.comments.isLoaded = true;
        if (!state.interactions[action.payload.videoId]) {
          state.interactions[action.payload.videoId] = {
            isLiked: false,
            isDisliked: false,
            comments: []
          };
        }
        state.interactions[action.payload.videoId].comments = action.payload.comments;
      })
      .addCase(fetchVideoCommentsThunk.rejected, (state, action) => {
        state.loadingStates.comments.isLoading = false;
        state.loadingStates.comments.isLoaded = false;
        state.errors.comments = action.error.message || 'Failed to fetch comments';
      })

      // Add Video Comment
      .addCase(addVideoComment.pending, (state) => {
        state.loadingStates.comments.isLoading = true;
        state.errors.comments = undefined;
      })
      .addCase(addVideoComment.fulfilled, (state, action) => {
        state.loadingStates.comments.isLoading = false;
        state.loadingStates.comments.isLoaded = true;
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
        });
      })
      .addCase(addVideoComment.rejected, (state, action) => {
        state.loadingStates.comments.isLoading = false;
        state.loadingStates.comments.isLoaded = false;
        state.errors.comments = action.error.message || 'Failed to add comment';
      })

      // Toggle Video Like
      .addCase(toggleVideoLike.pending, (state) => {
        state.loadingStates.likes.isLoading = true;
        delete state.errors.like;
      })
      .addCase(toggleVideoLike.fulfilled, (state, action) => {
        state.loadingStates.likes.isLoading = false;
        state.loadingStates.likes.isLoaded = true;
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
        state.loadingStates.likes.isLoading = false;
        state.loadingStates.likes.isLoaded = false;
        state.errors.like = action.error.message || 'Failed to toggle like';
      })

      // Toggle Video Dislike
      .addCase(toggleVideoDislike.pending, (state) => {
        state.loadingStates.likes.isLoading = true;
        delete state.errors.dislike;
      })
      .addCase(toggleVideoDislike.fulfilled, (state, action) => {
        state.loadingStates.likes.isLoading = false;
        state.loadingStates.likes.isLoaded = true;
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
        state.loadingStates.likes.isLoading = false;
        state.loadingStates.likes.isLoaded = false;
        state.errors.dislike = action.error.message || 'Failed to toggle dislike';
      })

      // Increment Video View
      .addCase(incrementVideoView.pending, (state) => {
        state.loadingStates.video.isLoading = true;
        delete state.errors.view;
      })
      .addCase(incrementVideoView.fulfilled, (state) => {
        state.loadingStates.video.isLoading = false;
      })
      .addCase(incrementVideoView.rejected, (state, action) => {
        state.loadingStates.video.isLoading = false;
        state.errors.view = action.error.message || 'Failed to increment view';
      })

      // Handle Swipe Gesture
      .addCase(handleSwipeGesture.pending, (state) => {
        logger.debug('Starting swipe gesture', {
          currentIndex: state.currentIndex,
          isSwipeInProgress: state.swipeState.isSwipeInProgress,
          currentVideoId: state.currentVideo?.video.id
        });
        // Don't set swipeInProgress here anymore
        state.player.isPlaying = false;
      })
      .addCase(handleSwipeGesture.fulfilled, (state, action) => {
        logger.debug('Completed swipe gesture', {
          currentIndex: state.currentIndex,
          duration: Date.now() - state.swipeState.lastSwipeTime,
          newVideoId: state.currentVideo?.video.id,
          success: action.payload?.success
        });
        state.player.isPlaying = true;
      })
      .addCase(handleSwipeGesture.rejected, (state, action) => {
        logger.error('Failed swipe gesture', {
          error: action.error.message,
          currentIndex: state.currentIndex,
          duration: Date.now() - state.swipeState.lastSwipeTime
        });
        state.player.isPlaying = true; // Resume current video on failure
      })

      // Handle playback status update
      .addCase(handlePlaybackStatusUpdate.fulfilled, (state, action) => {
        const oldState = { ...state.player };
        state.player.isPlaying = action.payload.isPlaying ?? false;
        state.player.position = action.payload.position ?? 0;
        state.player.duration = action.payload.duration ?? 0;
        state.player.isBuffering = action.payload.isBuffering ?? false;
        state.player.volume = action.payload.volume ?? 1;
        state.player.isMuted = action.payload.isMuted ?? false;

        // Only log significant changes
        if (oldState.isPlaying !== state.player.isPlaying || 
            oldState.isBuffering !== state.player.isBuffering ||
            Math.abs(oldState.position - state.player.position) > 1000) {
          logger.debug('Playback status updated', {
            videoId: state.currentVideo?.video.id,
            isPlaying: state.player.isPlaying,
            isBuffering: state.player.isBuffering,
            position: state.player.position,
            duration: state.player.duration,
            progress: state.player.duration ? Math.round((state.player.position / state.player.duration) * 100) : 0
          });
        }
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

// Selectors
export const selectVideoState = (state: RootState): VideoState => state.video;

export const selectLoadingState = (state: RootState): LoadingState => ({
  isLoading: state.video.isLoading,
  isLoaded: state.video.isLoaded,
  error: state.video.error
});

export const selectVideoLoadingStates = (state: RootState) => state.video.loadingStates;
export const selectVideoInteractions = (state: RootState) => state.video.interactions;
export const selectVideoPlayer = (state: RootState) => state.video.player;
export const selectVideoFeed = (state: RootState) => state.video.feed;

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
  (videoState) => videoState.loadingStates.comments.isLoading
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
  (videoState) => videoState.loadingStates.likes.isLoading
);

export const selectIsProcessingTip = createSelector(
  [selectVideoState],
  (videoState) => videoState.loadingStates.tips.isLoading
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

export const selectIsVideoDataReady = createSelector(
  [selectVideoState],
  (videoState) => ({
    isReady: videoState.isVideosLoaded && videoState.isMetadataLoaded && videoState.currentVideo !== null,
    isLoading: videoState.isLoading,
    error: videoState.error
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
  triggerSwipe,
} = videoSlice.actions;

export default videoSlice.reducer; 