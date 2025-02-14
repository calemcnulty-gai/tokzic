import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import type { 
  Comment, 
  Like, 
  Dislike, 
  Tip 
} from '../../types/firestore';
import type { 
  RootState, 
  AppDispatch, 
  ThunkConfig
} from '../types';
import type {
  InteractionState,
  LikePayload,
  DislikePayload,
  InteractionResponse,
} from '../../types/interactions';
import { selectUser } from '../slices/firebase/selectors';
import {
  fetchVideoComments as fetchFirebaseComments,
  addComment as addFirebaseComment,
  toggleLike as toggleFirebaseLike,
  toggleDislike as toggleFirebaseDislike,
  fetchVideoTips as fetchFirebaseTips,
  addTip as addFirebaseTip
} from './firebase/thunks/firestoreThunks';

const logger = createLogger('InteractionSlice');

const initialState: InteractionState = {
  comments: {},
  likes: {},
  dislikes: {},
  tips: {},
  loadingState: {
    isLoading: false,
    isLoaded: false,
    error: null
  },
  loadingStates: {
    comments: {
      isLoading: false,
      isLoaded: false,
      error: null
    },
    likes: {
      isLoading: false,
      isLoaded: false,
      error: null
    },
    tips: {
      isLoading: false,
      isLoaded: false,
      error: null
    }
  },
  errors: {
    comments: undefined,
    like: undefined,
    dislike: undefined
  }
};

// Fetch video comments
export const fetchVideoComments = createAsyncThunk<
  { videoId: string; comments: Comment[] },
  string,
  ThunkConfig
>('interaction/fetchComments', async (videoId, { dispatch, getState }) => {
  const state = getState() as RootState;
  const interactionState = state.interaction;
  logger.info('Fetching video comments', { 
    videoId,
    existingComments: interactionState.comments[videoId]?.length ?? 0,
    isLoading: interactionState.loadingState.isLoading
  });

  try {
    const comments = await (dispatch as AppDispatch)(fetchFirebaseComments(videoId)).unwrap();
    logger.info('Successfully fetched comments', {
      videoId,
      commentCount: comments.length,
      oldestComment: comments[comments.length - 1]?.createdAt,
      newestComment: comments[0]?.createdAt
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
      createdAt: Date.now(),
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
  InteractionResponse<Like>,
  LikePayload,
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

// Toggle dislike
export const toggleDislike = createAsyncThunk<
  InteractionResponse<Dislike>,
  DislikePayload,
  ThunkConfig
>('interaction/toggleDislike', async ({ videoId, userId }, { dispatch }) => {
  try {
    const result = await (dispatch as AppDispatch)(toggleFirebaseDislike({ videoId, userId })).unwrap();
    return { 
      action: result.action,
      videoId,
      data: result.dislike,
      id: result.dislikeId
    };
  } catch (error) {
    logger.error('Failed to toggle dislike', { videoId, error });
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

// Handle video like
export const handleVideoLike = createAsyncThunk<
  void,
  { videoId: string },
  ThunkConfig
>('interaction/handleVideoLike', async ({ videoId }, { dispatch, getState }) => {
  const state = getState();
  const user = selectUser(state);
  
  if (!user) {
    throw new Error('Must be logged in to like videos');
  }

  try {
    await dispatch(toggleLike({ 
      videoId, 
      userId: user.uid,
      type: 'like'
    })).unwrap();
  } catch (error) {
    logger.error('Error handling video like', { error });
    throw error;
  }
});

// Handle video dislike
export const handleVideoDislike = createAsyncThunk<
  void,
  { videoId: string },
  ThunkConfig
>('interaction/handleVideoDislike', async ({ videoId }, { dispatch, getState }) => {
  const state = getState();
  const user = selectUser(state);
  
  if (!user) {
    throw new Error('Must be logged in to dislike videos');
  }

  try {
    await dispatch(toggleDislike({ 
      videoId, 
      userId: user.uid,
      type: 'dislike'
    })).unwrap();
  } catch (error) {
    logger.error('Error handling video dislike', { error });
    throw error;
  }
});

// Handle comment submission
export const handleCommentSubmission = createAsyncThunk<
  void,
  { text: string; videoId: string },
  ThunkConfig
>('interaction/handleCommentSubmission', async ({ text, videoId }, { dispatch, getState }) => {
  const state = getState();
  const user = selectUser(state);

  if (!user) {
    logger.warn('Comment submission ignored - no user');
    throw new Error('Must be logged in to comment');
  }

  try {
    await dispatch(addComment({
      videoId,
      userId: user.uid,
      text,
      username: user.displayName || 'Anonymous'
    })).unwrap();
  } catch (error) {
    logger.error('Error submitting comment', { error });
    throw error;
  }
});

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    clearError: (state) => {
      state.loadingState.error = null;
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
        state.loadingState.isLoading = true;
        state.loadingState.error = null;
      })
      .addCase(fetchVideoComments.fulfilled, (state, action) => {
        logger.info('Comments fetch successful', {
          videoId: action.payload.videoId,
          commentCount: action.payload.comments.length,
          totalVideosWithComments: Object.keys(state.comments).length
        });
        state.loadingState.isLoading = false;
        state.loadingState.isLoaded = true;
        state.comments[action.payload.videoId] = action.payload.comments;
      })
      .addCase(fetchVideoComments.rejected, (state, action) => {
        logger.error('Comments fetch failed', {
          videoId: action.meta.arg,
          error: action.error.message,
          existingComments: state.comments[action.meta.arg]?.length ?? 0
        });
        state.loadingState.isLoading = false;
        state.loadingState.error = action.error.message || null;
      })

      // Add Comment
      .addCase(addComment.pending, (state) => {
        state.loadingState.isLoading = true;
        state.loadingState.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.loadingState.isLoading = false;
        if (!state.comments[action.payload.videoId]) {
          state.comments[action.payload.videoId] = [];
        }
        state.comments[action.payload.videoId].unshift(action.payload.comment);
      })
      .addCase(addComment.rejected, (state, action) => {
        state.loadingState.isLoading = false;
        state.loadingState.error = action.error.message || 'Failed to add comment';
      })

      // Toggle Like
      .addCase(toggleLike.pending, (state) => {
        logger.debug('Starting like toggle', {
          isLoading: state.loadingState.isLoading
        });
        state.loadingState.isLoading = true;
        state.loadingState.error = null;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        logger.info('Like toggle successful', {
          action: action.payload.action,
          videoId: action.payload.videoId,
          hasLike: !!action.payload.data,
          likeId: action.payload.id
        });
        state.loadingState.isLoading = false;
        if (action.payload.action === 'add' && 'data' in action.payload) {
          if (!state.likes[action.payload.videoId]) {
            state.likes[action.payload.videoId] = [];
          }
          if (action.payload.data) {
            state.likes[action.payload.videoId].push(action.payload.data);
          }
        } else if (action.payload.action === 'remove') {
          if (state.likes[action.payload.videoId]) {
            state.likes[action.payload.videoId] = state.likes[action.payload.videoId]
              .filter(like => like.id !== action.payload.id);
          }
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        logger.error('Like toggle failed', {
          error: action.error.message,
          isLoading: state.loadingState.isLoading
        });
        state.loadingState.isLoading = false;
        state.loadingState.error = action.error.message || null;
      })

      // Fetch Tips
      .addCase(fetchVideoTips.pending, (state) => {
        state.loadingState.isLoading = true;
        state.loadingState.error = null;
      })
      .addCase(fetchVideoTips.fulfilled, (state, action) => {
        state.loadingState.isLoading = false;
        state.tips[action.payload.videoId] = action.payload.tips;
      })
      .addCase(fetchVideoTips.rejected, (state, action) => {
        state.loadingState.isLoading = false;
        state.loadingState.error = action.error.message || 'Failed to fetch tips';
      })

      // Add Tip
      .addCase(addTip.pending, (state) => {
        state.loadingState.isLoading = true;
        state.loadingState.error = null;
      })
      .addCase(addTip.fulfilled, (state, action) => {
        state.loadingState.isLoading = false;
        if (!state.tips[action.payload.videoId]) {
          state.tips[action.payload.videoId] = [];
        }
        state.tips[action.payload.videoId].unshift(action.payload.tip);
      })
      .addCase(addTip.rejected, (state, action) => {
        state.loadingState.isLoading = false;
        state.loadingState.error = action.error.message || 'Failed to add tip';
      });
  },
});

export const { clearError } = interactionSlice.actions;

export default interactionSlice.reducer; 