import { createAsyncThunk } from '@reduxjs/toolkit';
import { createLogger } from '../../../../utils/logger';
import type { 
  Comment, 
  Like, 
  Dislike, 
  Tip,
  VideoMetadata 
} from '../../../../types/firestore';
import type { ThunkConfig } from '../../../types';
import type { GetState } from '../../../types';
import { serviceManager } from '../services/ServiceManager';

const logger = createLogger('FirestoreThunks');

// Generic document operations
export const fetchDocument = createAsyncThunk<any, { collectionName: string; documentId: string }, ThunkConfig>(
  'firebase/firestore/fetchDocument',
  async ({ collectionName, documentId }) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    return firestoreService.fetchDocument(collectionName, documentId);
  }
);

export const updateDocument = createAsyncThunk<void, { collectionName: string; documentId: string; data: any }, ThunkConfig>(
  'firebase/firestore/updateDocument',
  async ({ collectionName, documentId, data }) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    await firestoreService.updateDocument(collectionName, documentId, data);
  }
);

export const deleteDocument = createAsyncThunk<void, { collectionName: string; documentId: string }, ThunkConfig>(
  'firebase/firestore/deleteDocument',
  async ({ collectionName, documentId }) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    await firestoreService.deleteDocument(collectionName, documentId);
  }
);

// Video-specific operations
export const fetchVideoMetadata = createAsyncThunk<VideoMetadata | null, string, ThunkConfig>(
  'firebase/firestore/fetchVideoMetadata',
  async (videoId) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    return firestoreService.fetchVideoMetadata(videoId);
  }
);

export const updateVideoMetadata = createAsyncThunk<void, { videoId: string; updates: Partial<Omit<VideoMetadata, 'id'>> }, ThunkConfig>(
  'firebase/firestore/updateVideoMetadata',
  async ({ videoId, updates }) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    await firestoreService.updateVideoMetadata(videoId, updates);
  }
);

// Comment operations
export const fetchVideoComments = createAsyncThunk<Comment[], string, ThunkConfig>(
  'firebase/firestore/fetchVideoComments',
  async (videoId) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    return firestoreService.fetchVideoComments(videoId);
  }
);

export const addComment = createAsyncThunk<Comment, Omit<Comment, 'id'>, ThunkConfig>(
  'firebase/firestore/addComment',
  async (comment) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    return firestoreService.addComment(comment);
  }
);

// Like operations
export const fetchVideoLikes = createAsyncThunk<Like[], string, ThunkConfig>(
  'firebase/firestore/fetchVideoLikes',
  async (videoId) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    return firestoreService.fetchVideoLikes(videoId);
  }
);

export const toggleLike = createAsyncThunk<
  { action: 'add' | 'remove'; like?: Like; likeId?: string }, 
  { videoId: string; userId: string; type?: 'like' | 'superLike' }, 
  ThunkConfig
>('firebase/firestore/toggleLike', async ({ videoId, userId, type = 'like' }) => {
  const firestoreService = serviceManager.getFirestoreService();
  if (!firestoreService) {
    throw new Error('Firestore service not initialized');
  }

  return firestoreService.toggleLike(videoId, userId, type);
});

// Dislike operations
export const toggleDislike = createAsyncThunk<
  { action: 'add' | 'remove'; dislike?: Dislike; dislikeId?: string },
  { videoId: string; userId: string },
  ThunkConfig
>('firebase/firestore/toggleDislike', async ({ videoId, userId }) => {
  const firestoreService = serviceManager.getFirestoreService();
  if (!firestoreService) {
    throw new Error('Firestore service not initialized');
  }

  const result = await firestoreService.toggleDislike(videoId, userId);
  return {
    action: result.action,
    dislike: result.dislike,
    dislikeId: result.dislikeId
  };
});

// Tip operations
export const fetchVideoTips = createAsyncThunk<Tip[], string, ThunkConfig>(
  'firebase/firestore/fetchVideoTips',
  async (videoId) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    return firestoreService.fetchVideoTips(videoId);
  }
);

export const addTip = createAsyncThunk<Tip, Omit<Tip, 'id'>, ThunkConfig>(
  'firebase/firestore/addTip',
  async (tip) => {
    const firestoreService = serviceManager.getFirestoreService();
    if (!firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    return firestoreService.addTip(tip);
  }
); 