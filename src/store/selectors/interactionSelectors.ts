import { createSelector } from '@reduxjs/toolkit';
import type { RootState, VideoInteractionState } from '../types';
import { selectUser } from '../slices/firebase/selectors';

// Base selectors
const selectInteractionState = (state: RootState) => state.interaction;
const selectLoadingStates = (state: RootState) => state.interaction.loadingStates;

// Data selectors with memoization
export const selectVideoComments = createSelector(
  [(state: RootState, videoId: string) => state.interaction.comments[videoId]],
  (comments) => comments || []
);

export const selectVideoLikes = createSelector(
  [(state: RootState, videoId: string) => state.interaction.likes[videoId]],
  (likes) => likes || []
);

export const selectVideoTips = createSelector(
  [(state: RootState, videoId: string) => state.interaction.tips[videoId]],
  (tips) => tips || []
);

export const selectVideoDislikes = createSelector(
  [(state: RootState, videoId: string) => state.interaction.dislikes[videoId]],
  (dislikes) => dislikes || []
);

export const selectVideoMetrics = createSelector(
  [selectVideoLikes, selectVideoDislikes, selectVideoComments, selectVideoTips],
  (likes, dislikes, comments, tips) => ({
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
  })
);

export const selectVideoInteractionState = createSelector(
  [
    selectVideoLikes,
    selectVideoDislikes,
    selectVideoComments,
    selectVideoMetrics,
    selectUser,
    selectInteractionState,
  ],
  (likes, dislikes, comments, metrics, user, interactionState): VideoInteractionState => ({
    isLiked: user ? likes.some(like => like.userId === user.uid) : false,
    isDisliked: user ? dislikes.some(dislike => dislike.userId === user.uid) : false,
    likeCount: likes.length,
    dislikeCount: dislikes.length,
    comments,
    metrics,
    loadingState: interactionState.loadingState
  })
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