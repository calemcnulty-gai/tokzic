import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import type { Comment, Like, Dislike, Tip } from '../../types/firestore';
import type { RootState, AppDispatch, ThunkConfig } from '../types';
import {
  fetchVideoComments as fetchFirebaseComments,
  addComment as addFirebaseComment,
  fetchVideoLikes as fetchFirebaseLikes,
  toggleLike as toggleFirebaseLike,
  fetchVideoTips as fetchFirebaseTips,
  addTip as addFirebaseTip
} from './firebase/thunks/firestoreThunks';

const logger = createLogger('InteractionSlice');

interface LoadingState {
  isLoading: boolean;  // Currently loading
  isLoaded: boolean;   // Successfully loaded
  error: string | null // Any error that occurred
}

interface InteractionLoadingStates {
  comments: LoadingState;
  like: LoadingState;
  tip: LoadingState;
}

interface InteractionErrors {
  comments?: string;
  like?: string;
  tip?: string;
}

interface InteractionState {
  // Collections
  comments: Record<string, Comment[]>; // videoId -> comments
  likes: Record<string, Like[]>; // videoId -> likes
  dislikes: Record<string, Dislike[]>; // videoId -> dislikes
  tips: Record<string, Tip[]>; // videoId -> tips
  
  // Loading states
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  
  // Granular loading states and errors
  loadingStates: InteractionLoadingStates;
  errors: InteractionErrors;
}

const initialState: InteractionState = {
  // Collections
  comments: {},
  likes: {},
  dislikes: {},
  tips: {},
  
  // Root loading state
  isLoading: false,
  isLoaded: false,
  error: null,

  // Granular states
  loadingStates: {
    comments: { isLoading: false, isLoaded: false, error: null },
    like: { isLoading: false, isLoaded: false, error: null },
    tip: { isLoading: false, isLoaded: false, error: null }
  },
  errors: {}
};

// Fetch video comments
export const fetchVideoComments = createAsyncThunk<
  { videoId: string; comments: Comment[] },
  string,
  ThunkConfig
>('interaction/fetchComments', async (videoId, { dispatch, getState }) => {
  const state = getState() as RootState;
  const interactionState = state.interaction as InteractionState;
  logger.info('Fetching video comments', { 
    videoId,
    existingComments: interactionState.comments[videoId]?.length ?? 0,
    isLoading: interactionState.loadingStates.comments.isLoading
  });

  try {
    const comments = await (dispatch as AppDispatch)(fetchFirebaseComments(videoId)).unwrap();
    logger.info('Successfully fetched comments', {
      videoId,
      commentCount: comments.length,
      oldestComment: comments[comments.length - 1]?.timestamp,
      newestComment: comments[0]?.timestamp
    });
    return { videoId, comments };
  } catch (error) {
    logger.error('Failed to fetch comments', { 
      videoId, 
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error 
    });
    throw error;
  }
});

// Add comment
export const addComment = createAsyncThunk<
  { videoId: string; comment: Comment },
  { videoId: string; text: string; userId: string; username: string },
  ThunkConfig
>('interaction/addComment', async ({ videoId, text, userId, username }, { dispatch }) => {
  try {
    const comment = await (dispatch as AppDispatch)(addFirebaseComment({
      text,
      userId,
      username,
      timestamp: Date.now(),
      videoId,
    })).unwrap();

    return { videoId, comment };
  } catch (error) {
    logger.error('Failed to add comment', { videoId, error });
    throw error;
  }
});

// Toggle like
export const toggleLike = createAsyncThunk<
  { action: 'add' | 'remove'; like?: Like; likeId?: string; videoId: string },
  { videoId: string; userId: string; type?: 'like' | 'superLike' },
  ThunkConfig
>('interaction/toggleLike', async ({ videoId, userId, type = 'like' }, { dispatch }) => {
  try {
    const result = await (dispatch as AppDispatch)(toggleFirebaseLike({ videoId, userId, type })).unwrap();
    return { ...result, videoId };
  } catch (error) {
    logger.error('Failed to toggle like', { videoId, error });
    throw error;
  }
});

// Fetch video tips
export const fetchVideoTips = createAsyncThunk<
  { videoId: string; tips: Tip[] },
  string,
  ThunkConfig
>('interaction/fetchTips', async (videoId, { dispatch }) => {
  try {
    const tips = await (dispatch as AppDispatch)(fetchFirebaseTips(videoId)).unwrap();
    return { videoId, tips };
  } catch (error) {
    logger.error('Failed to fetch tips', { videoId, error });
    throw error;
  }
});

// Add tip
export const addTip = createAsyncThunk<
  { videoId: string; tip: Tip },
  {
    videoId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    message?: string;
    type: 'regular' | 'toxic';
  },
  ThunkConfig
>('interaction/addTip', async (params, { dispatch }) => {
  try {
    const tip = await (dispatch as AppDispatch)(addFirebaseTip({
      ...params,
      createdAt: Date.now(),
    })).unwrap();

    return { videoId: params.videoId, tip };
  } catch (error) {
    logger.error('Failed to add tip', { videoId: params.videoId, error });
    throw error;
  }
});

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.errors = {};
    },
    clearSpecificError: (state, action: PayloadAction<keyof InteractionErrors>) => {
      const key = action.payload;
      if (key in state.errors) {
        delete state.errors[key];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Comments
      .addCase(fetchVideoComments.pending, (state, { meta }) => {
        logger.debug('Starting comments fetch', {
          videoId: meta.arg,
          existingComments: state.comments[meta.arg]?.length ?? 0
        });
        state.loadingStates.comments.isLoading = true;
        state.loadingStates.comments.isLoaded = false;
        state.loadingStates.comments.error = null;
        delete state.errors.comments;
      })
      .addCase(fetchVideoComments.fulfilled, (state, action) => {
        logger.info('Comments fetch successful', {
          videoId: action.payload.videoId,
          commentCount: action.payload.comments.length,
          totalVideosWithComments: Object.keys(state.comments).length
        });
        state.loadingStates.comments.isLoading = false;
        state.loadingStates.comments.isLoaded = true;
        state.comments[action.payload.videoId] = action.payload.comments;
      })
      .addCase(fetchVideoComments.rejected, (state, action) => {
        logger.error('Comments fetch failed', {
          videoId: action.meta.arg,
          error: action.error.message,
          existingComments: state.comments[action.meta.arg]?.length ?? 0
        });
        state.loadingStates.comments.isLoading = false;
        state.loadingStates.comments.isLoaded = false;
        state.loadingStates.comments.error = action.error.message || null;
        state.errors.comments = action.error.message || 'Failed to fetch comments';
      })

      // Add Comment
      .addCase(addComment.pending, (state) => {
        state.isLoading = true;
        state.isLoaded = false;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoaded = true;
        if (!state.comments[action.payload.videoId]) {
          state.comments[action.payload.videoId] = [];
        }
        state.comments[action.payload.videoId].unshift(action.payload.comment);
      })
      .addCase(addComment.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Failed to add comment';
      })

      // Toggle Like
      .addCase(toggleLike.pending, (state) => {
        logger.debug('Starting like toggle', {
          isLoading: state.loadingStates.like.isLoading,
          isLoaded: state.loadingStates.like.isLoaded
        });
        state.loadingStates.like.isLoading = true;
        state.loadingStates.like.error = null;
        delete state.errors.like;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        logger.info('Like toggle successful', {
          action: action.payload.action,
          videoId: action.payload.videoId,
          hasLike: !!action.payload.like,
          likeId: action.payload.likeId
        });
        state.loadingStates.like.isLoading = false;
        state.loadingStates.like.isLoaded = true;
        if (action.payload.action === 'add' && 'like' in action.payload) {
          if (!state.likes[action.payload.videoId]) {
            state.likes[action.payload.videoId] = [];
          }
          if (action.payload.like) {
            state.likes[action.payload.videoId].push(action.payload.like);
          }
        } else if (action.payload.action === 'remove') {
          if (state.likes[action.payload.videoId]) {
            state.likes[action.payload.videoId] = state.likes[action.payload.videoId]
              .filter(like => like.id !== action.payload.likeId);
          }
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        logger.error('Like toggle failed', {
          error: action.error.message,
          isLoading: state.loadingStates.like.isLoading,
          isLoaded: state.loadingStates.like.isLoaded
        });
        state.loadingStates.like.isLoading = false;
        state.loadingStates.like.isLoaded = false;
        state.loadingStates.like.error = action.error.message || null;
        state.errors.like = action.error.message || 'Failed to toggle like';
      })

      // Fetch Tips
      .addCase(fetchVideoTips.pending, (state) => {
        state.isLoading = true;
        state.isLoaded = false;
        state.error = null;
      })
      .addCase(fetchVideoTips.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoaded = true;
        state.tips[action.payload.videoId] = action.payload.tips;
      })
      .addCase(fetchVideoTips.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Failed to fetch tips';
      })

      // Add Tip
      .addCase(addTip.pending, (state) => {
        state.isLoading = true;
        state.isLoaded = false;
        state.error = null;
      })
      .addCase(addTip.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoaded = true;
        if (!state.tips[action.payload.videoId]) {
          state.tips[action.payload.videoId] = [];
        }
        state.tips[action.payload.videoId].unshift(action.payload.tip);
      })
      .addCase(addTip.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoaded = false;
        state.error = action.error.message || 'Failed to add tip';
      });
  },
});

export const { clearError, clearSpecificError } = interactionSlice.actions;

// Selectors
export const selectInteractionState = (state: RootState) => {
  const interactionState = state.interaction as InteractionState;
  return {
    isLoading: interactionState.isLoading,
    isLoaded: interactionState.loadingStates.comments.isLoaded || 
              interactionState.loadingStates.like.isLoaded || 
              interactionState.loadingStates.tip.isLoaded,
    error: interactionState.error
  };
};

export const selectVideoComments = (state: RootState, videoId: string) => 
  state.interaction.comments[videoId] || [];

export const selectVideoLikes = (state: RootState, videoId: string) =>
  state.interaction.likes[videoId] || [];

export const selectVideoTips = (state: RootState, videoId: string) =>
  state.interaction.tips[videoId] || [];

export default interactionSlice.reducer; 