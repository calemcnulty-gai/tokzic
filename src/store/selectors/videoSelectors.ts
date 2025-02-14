import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../';
import type { VideoMetadata } from '../../types/firestore';

// Base selectors
const selectVideoState = (state: RootState) => state.video;
const selectCurrentIndex = (state: RootState) => state.video.currentIndex;
const selectVideos = (state: RootState) => state.video.videos;
const selectLoadingStates = (state: RootState) => state.video.loadingStates;
const selectErrors = (state: RootState) => state.video.errors;

// Memoized selectors
export const selectCurrentVideo = createSelector(
  [selectVideos, selectCurrentIndex],
  (videos, currentIndex) => videos[currentIndex]
);

export const selectCurrentVideoMetadata = createSelector(
  [selectCurrentVideo],
  (currentVideo) => currentVideo?.metadata
);

export const selectVideoLoadingState = createSelector(
  [selectLoadingStates],
  (loadingStates) => loadingStates
);

export const selectVideoErrors = createSelector(
  [selectErrors],
  (errors) => errors
);

// Navigation state selectors
export const selectIsAtStart = createSelector(
  [selectVideoState],
  (state) => state.isAtStart
);

export const selectIsAtEnd = createSelector(
  [selectVideoState],
  (state) => state.isAtEnd
);

// Pagination selectors
export const selectHasNextVideo = createSelector(
  [selectCurrentIndex, selectVideos, selectIsAtEnd],
  (currentIndex, videos, isAtEnd) => !isAtEnd && currentIndex < videos.length - 1
);

export const selectHasPreviousVideo = createSelector(
  [selectCurrentIndex, selectIsAtStart],
  (currentIndex, isAtStart) => !isAtStart && currentIndex > 0
);

// Buffer state selectors
export const selectBufferState = createSelector(
  [selectVideos, selectCurrentIndex],
  (videos, currentIndex) => ({
    totalVideos: videos.length,
    currentIndex,
    hasNextInBuffer: currentIndex < videos.length - 1,
    hasPreviousInBuffer: currentIndex > 0,
    bufferSize: videos.length
  })
); 