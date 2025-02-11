import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import { createLogger } from '../../utils/logger';
import type { Comment, Like, Dislike, Tip } from '../../types/firestore';

const logger = createLogger('InteractionSlice');

interface InteractionState {
  comments: Record<string, Comment[]>; // videoId -> comments
  likes: Record<string, Like[]>; // videoId -> likes
  dislikes: Record<string, Dislike[]>; // videoId -> dislikes
  tips: Record<string, Tip[]>; // videoId -> tips
  isLoading: boolean;
  error: string | null;
}

const initialState: InteractionState = {
  comments: {},
  likes: {},
  dislikes: {},
  tips: {},
  isLoading: false,
  error: null,
};

export const fetchVideoComments = createAsyncThunk(
  'interaction/fetchComments',
  async (videoId: string) => {
    try {
      const snapshot = await firestore()
        .collection('comments')
        .where('videoId', '==', videoId)
        .orderBy('timestamp', 'desc')
        .get();

      return {
        videoId,
        comments: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)),
      };
    } catch (error) {
      logger.error('Failed to fetch comments', { videoId, error });
      throw error;
    }
  }
);

export const addComment = createAsyncThunk(
  'interaction/addComment',
  async ({ videoId, text, userId, username }: {
    videoId: string;
    text: string;
    userId: string;
    username: string;
  }) => {
    try {
      const comment: Omit<Comment, 'id'> = {
        text,
        userId,
        username,
        timestamp: Date.now(),
        videoId,
      };

      const docRef = await firestore()
        .collection('comments')
        .add(comment);

      return {
        videoId,
        comment: { id: docRef.id, ...comment },
      };
    } catch (error) {
      logger.error('Failed to add comment', { videoId, error });
      throw error;
    }
  }
);

export const toggleLike = createAsyncThunk(
  'interaction/toggleLike',
  async ({ videoId, userId, type = 'like' }: {
    videoId: string;
    userId: string;
    type?: 'like' | 'superLike';
  }) => {
    try {
      const likeRef = firestore()
        .collection('likes')
        .where('videoId', '==', videoId)
        .where('userId', '==', userId)
        .limit(1);

      const snapshot = await likeRef.get();

      if (snapshot.empty) {
        const like: Omit<Like, 'id'> = {
          videoId,
          userId,
          type,
          createdAt: Date.now(),
        };

        const docRef = await firestore()
          .collection('likes')
          .add(like);

        return {
          videoId,
          like: { id: docRef.id, ...like },
          action: 'add',
        };
      } else {
        await snapshot.docs[0].ref.delete();
        return {
          videoId,
          likeId: snapshot.docs[0].id,
          action: 'remove',
        };
      }
    } catch (error) {
      logger.error('Failed to toggle like', { videoId, error });
      throw error;
    }
  }
);

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Comments
      .addCase(fetchVideoComments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVideoComments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.comments[action.payload.videoId] = action.payload.comments;
      })
      .addCase(fetchVideoComments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch comments';
      })

      // Add Comment
      .addCase(addComment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!state.comments[action.payload.videoId]) {
          state.comments[action.payload.videoId] = [];
        }
        state.comments[action.payload.videoId].unshift(action.payload.comment);
      })
      .addCase(addComment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to add comment';
      })

      // Toggle Like
      .addCase(toggleLike.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.action === 'add') {
          if (!state.likes[action.payload.videoId]) {
            state.likes[action.payload.videoId] = [];
          }
          if (action.payload.like) {
            state.likes[action.payload.videoId].push(action.payload.like);
          }
        } else {
          state.likes[action.payload.videoId] = state.likes[action.payload.videoId]
            ?.filter(like => like.id !== action.payload.likeId) || [];
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to toggle like';
      });
  },
});

export const { clearError } = interactionSlice.actions;
export default interactionSlice.reducer; 