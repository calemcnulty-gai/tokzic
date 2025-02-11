import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../';

// Base selectors
const selectUIState = (state: RootState) => state.ui;
const selectLoadingStates = (state: RootState) => state.ui.loadingStates;
const selectToasts = (state: RootState) => state.ui.toasts;

// Visibility selectors
export const selectVisibilityState = createSelector(
  [selectUIState],
  (ui) => ({
    isCommentsVisible: ui.isCommentsVisible,
    isOverlayVisible: ui.isOverlayVisible,
    isTipSelectorVisible: ui.isTipSelectorVisible
  })
);

export const selectCommentsVisibility = createSelector(
  [selectUIState],
  (ui) => ui.isCommentsVisible
);

export const selectOverlayVisibility = createSelector(
  [selectUIState],
  (ui) => ui.isOverlayVisible
);

export const selectTipSelectorVisibility = createSelector(
  [selectUIState],
  (ui) => ui.isTipSelectorVisible
);

// Modal selectors
export const selectActiveModal = createSelector(
  [selectUIState],
  (ui) => ui.activeModal
);

// Toast selectors
export const selectAllToasts = createSelector(
  [selectToasts],
  (toasts) => toasts
);

export const selectLatestToast = createSelector(
  [selectToasts],
  (toasts) => toasts[toasts.length - 1]
);

// Loading state selectors
export const selectAllLoadingStates = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates
);

export const selectIsLoadingComments = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.isLoadingComments
);

export const selectIsSubmittingComment = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.isSubmittingComment
);

export const selectIsProcessingTip = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.isProcessingTip
);

export const selectIsProcessingLike = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates.isProcessingLike
);

// Combined selectors
export const selectInteractionLoadingStates = createSelector(
  [selectLoadingStates],
  (loadingStates) => ({
    isLoadingComments: loadingStates.isLoadingComments,
    isSubmittingComment: loadingStates.isSubmittingComment,
    isProcessingTip: loadingStates.isProcessingTip,
    isProcessingLike: loadingStates.isProcessingLike
  })
);

// Combined loading states selector
export const selectCombinedLoadingState = createSelector(
  [selectLoadingStates],
  (loadingStates) => ({
    isLoadingComments: loadingStates.isLoadingComments,
    isSubmittingComment: loadingStates.isSubmittingComment,
    isProcessingLike: loadingStates.isProcessingLike,
    isProcessingTip: loadingStates.isProcessingTip,
    isProcessingVideo: loadingStates.isProcessingVideo,
    isLoadingMetadata: loadingStates.isLoadingMetadata
  })
); 