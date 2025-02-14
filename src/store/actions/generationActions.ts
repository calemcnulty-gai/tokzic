import { createAction } from '@reduxjs/toolkit';

export const handleGeneratedVideo = createAction<string>('video/handleGeneratedVideo');
export const addPendingGeneration = createAction<string>('video/addPendingGeneration');
export const removePendingGeneration = createAction<string>('video/removePendingGeneration'); 