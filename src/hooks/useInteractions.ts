import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectInteractionState,
  selectVideoComments,
  selectVideoLikes,
  selectVideoTips,
  fetchVideoComments,
  addComment,
  toggleLike,
  fetchVideoTips,
  addTip
} from '../store/slices/interactionSlice';
import { useLoadingState } from './useLoadingState';
import type { LoadingState } from '../types/state';
import type { Comment, Like, Tip } from '../types/firestore';

interface UseInteractionsResult extends LoadingState {
  // Data
  comments: Comment[];
  likes: Like[];
  tips: Tip[];

  // Actions
  fetchComments: (videoId: string) => Promise<void>;
  addComment: (params: {
    videoId: string;
    text: string;
    userId: string;
    username: string;
  }) => Promise<void>;
  toggleLike: (params: {
    videoId: string;
    userId: string;
    type?: 'like' | 'superLike';
  }) => Promise<void>;
  fetchTips: (videoId: string) => Promise<void>;
  addTip: (params: {
    videoId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    message?: string;
    type?: 'regular' | 'toxic';
  }) => Promise<void>;
}

export function useInteractions(videoId: string): UseInteractionsResult {
  const dispatch = useDispatch();
  const interactionState = useSelector(selectInteractionState);
  const comments = useSelector((state) => selectVideoComments(state, videoId));
  const likes = useSelector((state) => selectVideoLikes(state, videoId));
  const tips = useSelector((state) => selectVideoTips(state, videoId));

  const load = useCallback(() => {
    dispatch(fetchVideoComments(videoId));
    dispatch(fetchVideoTips(videoId));
  }, [dispatch, videoId]);

  // Use the standard loading state pattern
  const loadingState = useLoadingState(interactionState, load);

  // Interaction actions
  const handleFetchComments = useCallback(async (videoId: string) => {
    await dispatch(fetchVideoComments(videoId));
  }, [dispatch]);

  const handleAddComment = useCallback(async (params: {
    videoId: string;
    text: string;
    userId: string;
    username: string;
  }) => {
    await dispatch(addComment(params));
  }, [dispatch]);

  const handleToggleLike = useCallback(async (params: {
    videoId: string;
    userId: string;
    type?: 'like' | 'superLike';
  }) => {
    await dispatch(toggleLike(params));
  }, [dispatch]);

  const handleFetchTips = useCallback(async (videoId: string) => {
    await dispatch(fetchVideoTips(videoId));
  }, [dispatch]);

  const handleAddTip = useCallback(async (params: {
    videoId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    message?: string;
    type?: 'regular' | 'toxic';
  }) => {
    await dispatch(addTip(params));
  }, [dispatch]);

  return {
    ...loadingState,
    comments,
    likes,
    tips,
    fetchComments: handleFetchComments,
    addComment: handleAddComment,
    toggleLike: handleToggleLike,
    fetchTips: handleFetchTips,
    addTip: handleAddTip,
  };
} 