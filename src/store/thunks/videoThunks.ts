import { createAsyncThunk } from '@reduxjs/toolkit';
import { VideoMetadataService } from '../../services/video-metadata';
import { VideoInteractionService } from '../../services/video-interactions';
import { createLogger } from '../../utils/logger';
import type { RootState } from '../types';

const logger = createLogger('VideoThunks');
const videoInteractionService = new VideoInteractionService();

export const fetchVideoMetadata = createAsyncThunk(
  'video/fetchMetadata',
  async (videoId: string, { getState }) => {
    try {
      const state = getState() as RootState;
      const { db } = state.firebase;
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      
      const videoMetadataService = new VideoMetadataService(db);
      logger.info('Fetching video metadata', { videoId });
      const metadata = await videoMetadataService.fetchVideoMetadata(videoId);
      if (!metadata) {
        throw new Error('Video metadata not found');
      }
      return metadata;
    } catch (error) {
      logger.error('Failed to fetch video metadata', { videoId, error });
      throw error;
    }
  }
);

export const incrementVideoView = createAsyncThunk(
  'video/incrementView',
  async (videoId: string) => {
    try {
      logger.info('Incrementing video view', { videoId });
      await videoInteractionService.incrementViewCount(videoId);
      return { videoId };
    } catch (error) {
      logger.error('Failed to increment video view', { videoId, error });
      throw error;
    }
  }
); 