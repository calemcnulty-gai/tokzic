import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../';
import type { VideoInteractionState } from '../../types/interactions';
import { selectUser } from '../slices/firebase/selectors';

// Base selectors
const selectInteractionState = (state: RootState) => state.interaction;
const selectLoadingStates = (state: RootState) => state.interaction.loadingStates;

// Data selectors
export const selectVideoComments = (state: RootState, videoId: string) => 
  state.interaction.comments[videoId] || [];

export const selectVideoLikes = (state: RootState, videoId: string) =>
  state.interaction.likes[videoId] || [];

export const selectVideoTips = (state: RootState, videoId: string) =>
  state.interaction.tips[videoId] || [];

export const selectVideoInteractionState = createSelector(
  [
    selectInteractionState,
    selectUser,
    (_: RootState, videoId: string) => videoId
  ],
  (interactionState, user, videoId): VideoInteractionState => {
    const likes = interactionState.likes[videoId] || [];
    const dislikes = interactionState.dislikes[videoId] || [];
    const comments = interactionState.comments[videoId] || [];
    const tips = interactionState.tips[videoId] || [];
    
    const metrics = {
      likeCount: likes.length,
      dislikeCount: dislikes.length,
      commentCount: comments.length,
      tipCount: tips.length,
      lastInteractionTime: Math.max(
        ...likes.map(l => l.createdAt),
        ...dislikes.map(d => d.createdAt),
        ...comments.map(c => c.createdAt),
        0
      )
    };
    
    return {
      isLiked: user ? likes.some(like => like.userId === user.uid) : false,
      isDisliked: user ? dislikes.some(dislike => dislike.userId === user.uid) : false,
      likeCount: likes.length,
      dislikeCount: dislikes.length,
      comments,
      metrics,
      loadingState: interactionState.loadingState
    };
  }
);

// Loading state selectors
export const selectIsLoadingComments = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.comments.isLoading
);

export const selectIsSubmittingComment = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.comments.isLoading
);

export const selectIsProcessingTip = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.tips.isLoading
);

export const selectIsProcessingLike = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.likes.isLoading
);

// Combined loading states selector
export const selectInteractionLoadingStates = createSelector(
  [selectLoadingStates],
  (loadingStates) => ({
    isLoadingComments: loadingStates.comments.isLoading,
    isSubmittingComment: loadingStates.comments.isLoading,
    isProcessingTip: loadingStates.tips.isLoading,
    isProcessingLike: loadingStates.likes.isLoading
  })
); 