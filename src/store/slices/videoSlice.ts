import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { videoService } from '../../services/video';
import { VideoWithMetadata } from '../../types/video';
import { VideoMetadata } from '../../types/firestore';
import { createLogger } from '../../utils/logger';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { videoCacheManager } from '../../services/video-cache';
import { 
  fetchVideoMetadata as fetchVideoMetadataThunk,
  incrementVideoView
} from '../thunks/videoThunks';
import { createSwipe } from '../../services/swipe';
import type { RootState } from '../../store';
import { SwipeDirection } from '../../components/SwipeableVideoPlayer';
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { createSelector } from '@reduxjs/toolkit';
import { selectUser } from '../slices/firebase/selectors';
import type { AppDispatch } from '../../store';
import { ThunkDispatch, AnyAction } from '@reduxjs/toolkit';
import { generationService } from '../../services/generation';
import type { ThunkConfig } from '../types';

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
  video: LoadingState;
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
  currentVideo: VideoWithMetadata;
  currentIndex: number;
  lastVisible: QueryDocumentSnapshot<DocumentData, DocumentData> | null;
  isRefreshing: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
  isInitialized: boolean;
  isVideosLoaded: boolean;
  isMetadataLoaded: boolean;
  loadingStates: VideoLoadingStates;
  errors: {
    metadata?: string;
    view?: string;
    generation?: string;
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
    pendingGenerations: string[];
  };
}

export const initialState: VideoState = {
  // LoadingState
  isLoading: false,
  isLoaded: false,
  error: null,
  
  // Video specific state
  videos: [],
  currentVideo: {
    video: {
      id: '',
      url: '',
      createdAt: Date.now(),
    },
    metadata: {
      id: '',
      creatorId: '',
      createdAt: Date.now(),
      stats: {
        views: 0,
        likes: 0,
        dislikes: 0,
        comments: 0,
        tips: 0,
      }
    }
  },
  currentIndex: 0,
  lastVisible: null,
  isRefreshing: false,
  isAtStart: true,
  isAtEnd: true,
  isInitialized: false,
  isVideosLoaded: false,
  isMetadataLoaded: false,
  loadingStates: {
    metadata: { isLoading: false, isLoaded: false, error: null },
    video: { isLoading: false, isLoaded: false, error: null }
  },
  errors: {},
  swipeState: {
    isSwipeInProgress: false,
    lastSwipeTime: 0,
  },
  player: {
    isPlaying: false,
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
    pendingGenerations: [],
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
  async (_, { getState, dispatch }) => {
    const state = getState() as { video: VideoState };
    const { videos, currentIndex, lastVisible } = state.video;
    const user = selectUser(getState() as RootState);

    logger.info('Attempting to rotate forward', {
      currentIndex,
      totalVideos: videos.length,
      hasLastVisible: !!lastVisible,
      currentVideoId: videos[currentIndex]?.video?.id,
      nextVideoId: videos[currentIndex + 1]?.video?.id
    });

    try {
      // If we're at the last video, fetch recommendations
      if (currentIndex === videos.length - 1) {
        logger.info('At last video, fetching recommendations', {
          currentIndex,
          totalVideos: videos.length,
          userId: user?.uid
        });

        if (!user?.uid) {
          logger.warn('No user ID available for recommendations');
          return { type: 'loop' }; // Fallback to loop if no user
        }

        try {
          // Call the recommendation endpoint with timeout and error handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            logger.error('Recommendation request timed out');
          }, 5000); // 5 second timeout

          // Start both requests in parallel
          const recommendationPromise = fetch(`${process.env.FIREBASE_FUNCTIONS_URL}/getRecommendations/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
            }),
            signal: controller.signal
          });

          // Fire and forget the generation request
          logger.info('Triggering video generation', { userId: user.uid });
          fetch(`${process.env.FIREBASE_FUNCTIONS_URL}/generation/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
            })
          }).catch(error => {
            logger.warn('Failed to trigger generation', { error });
            // Don't throw - this is non-critical
          });

          // Wait for recommendations
          const response = await recommendationPromise;
          clearTimeout(timeoutId);

          if (!response.ok) {
            logger.error('Failed to get recommendations', {
              status: response.status,
              statusText: response.statusText
            });
            return { type: 'loop' }; // Fallback to loop if request fails
          }

          const data = await response.json();
          if (!data.recommendations || !data.recommendations.length) {
            logger.warn('No recommendations received');
            return { type: 'loop' }; // Fallback to loop if no recommendations
          }

          logger.info('Successfully fetched recommended video IDs', {
            recommendedCount: data.recommendations.length,
            firstVideoId: data.recommendations[0]
          });

          // Fetch the actual videos for the recommended IDs
          const recommendedVideos = await Promise.all(
            data.recommendations.map(async (videoId: string) => {
              try {
                // Use the video service to fetch each video, which will handle all initialization
                const video = await videoService.fetchVideoById(videoId);
                
                // Preload the video
                if (video.video.url) {
                  void videoCacheManager.preloadVideo(video.video);
                }
                
                return video;
              } catch (error) {
                logger.error('Failed to fetch recommended video', {
                  videoId,
                  error
                });
                return null;
              }
            })
          );

          const validVideos = recommendedVideos.filter((v): v is VideoWithMetadata => v !== null);

          if (!validVideos.length) {
            logger.warn('No valid recommended videos found');
            return { type: 'loop' }; // Fallback to loop if no valid videos
          }

          logger.info('Successfully fetched recommended videos', {
            recommendedCount: validVideos.length,
            firstVideoId: validVideos[0]?.video?.id
          });

          return {
            type: 'replace',
            videos: validVideos
          };
        } catch (error) {
          logger.error('Failed to get recommendations, falling back to loop', { 
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          return { type: 'loop' }; // Fallback to loop on any error
        }
      }

      // If we're near the end of our buffer, fetch more videos
      if (currentIndex >= videos.length - 2) {
        if (!lastVisible) {
          logger.info('No more pagination cursor, continuing with existing videos', {
            currentIndex,
            videosLength: videos.length
          });
          return { type: 'increment' };
        }
        
        logger.info('Fetching more videos for forward rotation', {
          currentIndex,
          videosLength: videos.length,
          lastVisibleId: lastVisible.id
        });
        const result = await videoService.fetchVideos(VIDEOS_PER_PAGE, lastVisible);
        
        if (result.videos.length === 0) {
          logger.info('No more new videos available, continuing with existing', {
            currentIndex,
            totalExisting: videos.length
          });
          return { type: 'increment' };
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
    const { currentIndex, videos } = state.video;

    logger.info('Attempting to rotate backward', {
      currentIndex,
      totalVideos: videos.length
    });

    try {
      // If we're at the first video, loop to end
      if (currentIndex === 0) {
        logger.info('At first video, looping to end', {
          totalVideos: videos.length
        });
        return { type: 'loop_end' };
      }

      // If we're near the start of our buffer, fetch previous videos
      if (currentIndex <= 2) {
        const firstVideo = videos[0].video;
        logger.info('Fetching previous videos for backward rotation');
        const prevVideos = await videoService.fetchVideosBefore(VIDEOS_PER_PAGE, firstVideo.id);
        
        if (prevVideos.length === 0) {
          logger.info('No previous videos available, continuing with existing', {
            currentIndex
          });
          return { type: 'decrement' };
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
        // Record the swipe first
        await createSwipe(currentVideo.video.id, direction);
        logger.info('Recorded swipe', {
          videoId: currentVideo.video.id,
          direction,
          duration: Date.now() - gestureState.lastGestureTimestamp
        });
        
        // Then rotate to next video
        await dispatch(rotateForward()).unwrap();
        logger.info('Completed forward rotation after horizontal swipe', {
          newIndex: (getState() as RootState).video.currentIndex,
          duration: Date.now() - gestureState.lastGestureTimestamp,
          success: true
        });
      } else if (direction === 'up') {
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

// Add new thunk for handling generated videos
export const handleGeneratedVideo = createAsyncThunk(
  'video/handleGeneratedVideo',
  async (videoId: string, { dispatch, getState }) => {
    logger.info('Handling new generated video', { videoId });
    const state = getState() as RootState;
    const { videos, currentIndex } = state.video;
    
    try {
      // Fetch the video and its metadata
      logger.info('Fetching generated video data', { videoId });
      const videoWithMetadata = await videoService.fetchVideoById(videoId);
      if (!videoWithMetadata) {
        throw new Error('Generated video metadata not found');
      }
      logger.info('Successfully fetched generated video', { 
        videoId,
        hasUrl: !!videoWithMetadata.video.url,
        hasMetadata: !!videoWithMetadata.metadata 
      });

      // Preload the video
      if (videoWithMetadata.video.url) {
        logger.info('Preloading generated video', { videoId });
        void videoCacheManager.preloadVideo(videoWithMetadata.video);
      }

      logger.info('Returning generated video data for insertion', { 
        videoId,
        currentIndex,
        insertPosition: currentIndex + 1
      });

      return {
        video: videoWithMetadata,
        insertIndex: currentIndex + 1
      };
    } catch (error) {
      logger.error('Failed to handle generated video', {
        videoId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
      throw error;
    }
  }
);

// Add new thunk for managing generated videos subscription
export const subscribeToGeneratedVideos = createAsyncThunk(
  'video/subscribeToGeneratedVideos',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const user = selectUser(state);
    
    if (!user) {
      logger.warn('Cannot subscribe to generated videos - no user logged in');
      return;
    }

    logger.info('Setting up generated videos subscription', { userId: user.uid });
    generationService.subscribeToGeneratedVideos();
  }
);

export const unsubscribeFromGeneratedVideos = createAsyncThunk(
  'video/unsubscribeFromGeneratedVideos',
  async () => {
    logger.info('Unsubscribing from generated videos');
    generationService.unsubscribeFromGeneratedVideos();
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
    addPendingGeneration(state, action: PayloadAction<string>) {
      state.feed.pendingGenerations.push(action.payload);
    },
    removePendingGeneration(state, action: PayloadAction<string>) {
      state.feed.pendingGenerations = state.feed.pendingGenerations.filter(
        id => id !== action.payload
      );
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
          state.currentVideo = {
            video: {
              id: '',
              url: '',
              createdAt: Date.now(),
            },
            metadata: {
              id: '',
              creatorId: '',
              createdAt: Date.now(),
              stats: {
                views: 0,
                likes: 0,
                dislikes: 0,
                comments: 0,
                tips: 0,
              }
            }
          };
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

        if (action.payload.type === 'loop') {
          logger.info('Looping back to start of feed');
          state.currentIndex = 0;
          state.currentVideo = state.videos[0];
          state.isAtEnd = false;
          state.player.isPlaying = true;
          state.player.position = 0;
        } else if (action.payload.type === 'replace' && action.payload.videos) {
          logger.info('Replacing feed with recommended videos', {
            newVideoCount: action.payload.videos.length
          });
          
          // Update loading states for the new videos
          state.loadingStates.metadata = { isLoading: false, isLoaded: true, error: null };
          state.loadingStates.video = { isLoading: false, isLoaded: true, error: null };
          
          state.videos = action.payload.videos;
          state.currentIndex = 0;
          state.currentVideo = state.videos[0];
          state.isAtEnd = false;
          state.player.isPlaying = true;
          state.player.position = 0;
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

        if (action.payload.type === 'loop_end') {
          logger.info('Looping to end of feed');
          state.currentIndex = state.videos.length - 1;
          state.currentVideo = state.videos[state.currentIndex];
          state.isAtStart = false;
          // Reset player state for new video
          state.player.isPlaying = true;
          state.player.position = 0;
        } else if (action.payload.type === 'prepend' && action.payload.videos) {
          state.videos.unshift(...action.payload.videos);
          state.currentIndex += action.payload.videos.length;
          state.currentVideo = state.videos[state.currentIndex];
          // Reset player state for new video
          state.player.isPlaying = true;
          state.player.position = 0;
        } else if (action.payload.type === 'decrement') {
          state.currentIndex--;
          state.isAtEnd = false;
          state.currentVideo = state.videos[state.currentIndex];
          // Reset player state for new video
          state.player.isPlaying = true;
          state.player.position = 0;
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

          // If this is the start of playback (position near 0), log the feed state
          if (state.player.position < 100 && state.player.isPlaying) {
            logger.info('New video started playing - Current feed state', {
              totalVideos: state.videos.length,
              currentIndex: state.currentIndex,
              currentVideoId: state.currentVideo?.video.id,
              feedVideos: state.videos.map((v, idx) => ({
                position: idx,
                videoId: v.video.id,
                isCurrent: idx === state.currentIndex
              }))
            });
          }
        }
      })
      .addCase(handlePlaybackStatusUpdate.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update playback status';
      })

      // Handle toggle playback
      .addCase(togglePlayback.fulfilled, (state, action) => {
        state.player.isPlaying = action.payload.isPlaying;
      })

      // Handle generated video
      .addCase(handleGeneratedVideo.pending, (state) => {
        logger.info('Starting to handle generated video');
        state.isLoading = true;
        state.error = null;
        state.errors.generation = undefined;
      })
      .addCase(handleGeneratedVideo.fulfilled, (state, action) => {
        logger.info('Inserting generated video into queue', {
          videoId: action.payload.video.video.id,
          insertIndex: action.payload.insertIndex,
          currentQueueSize: state.videos.length,
          currentVideoId: state.currentVideo?.video.id,
          currentIndex: state.currentIndex
        });
        
        // Create a new array and insert the video at the specified index
        const newVideos = [...state.videos];
        newVideos.splice(action.payload.insertIndex, 0, action.payload.video);
        
        // Update the videos array
        state.videos = newVideos;
        
        // Update loading states
        state.isLoading = false;
        state.error = null;
        state.errors.generation = undefined;
        
        // Initialize loading states for the new video
        state.loadingStates.metadata = { isLoading: false, isLoaded: true, error: null };
        state.loadingStates.video = { isLoading: false, isLoaded: true, error: null };

        logger.info('Successfully inserted generated video', {
          newQueueSize: newVideos.length,
          insertedAt: action.payload.insertIndex,
          currentIndex: state.currentIndex,
          currentVideoId: state.currentVideo?.video.id,
          nextVideoId: action.payload.video.video.id
        });

        // Log out the entire feed state after insertion
        logger.info('Feed state after insertion', {
          totalVideos: newVideos.length,
          currentIndex: state.currentIndex,
          feedVideos: newVideos.map((v, idx) => ({
            position: idx,
            videoId: v.video.id,
            isCurrent: idx === state.currentIndex
          }))
        });
      })
      .addCase(handleGeneratedVideo.rejected, (state, action) => {
        logger.error('Failed to handle generated video', { error: action.error });
        state.isLoading = false;
        state.error = action.error.message || null;
        state.errors.generation = action.error.message;
      })

      // Handle generated video subscription
      .addCase(subscribeToGeneratedVideos.pending, (state) => {
        logger.debug('Setting up generated videos subscription');
      })
      .addCase(subscribeToGeneratedVideos.fulfilled, (state) => {
        logger.info('Successfully subscribed to generated videos');
      })
      .addCase(subscribeToGeneratedVideos.rejected, (state, action) => {
        logger.error('Failed to subscribe to generated videos', { error: action.error });
        state.errors.generation = action.error.message || 'Failed to subscribe to generated videos';
      })
      .addCase(unsubscribeFromGeneratedVideos.fulfilled, (state) => {
        logger.info('Successfully unsubscribed from generated videos');
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
export const selectVideoPlayer = (state: RootState) => state.video.player;
export const selectVideoFeed = (state: RootState) => state.video.feed;

// Memoized complex selectors
export const selectCurrentVideo = createSelector(
  [selectVideoState],
  (videoState) => videoState.currentVideo
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
  setCurrentVideo,
  setPlaying,
  setMuted,
  setVolume,
  setActiveIndex,
  logFeedUpdate,
  triggerSwipe,
  addPendingGeneration,
  removePendingGeneration,
} = videoSlice.actions;

export default videoSlice.reducer; 