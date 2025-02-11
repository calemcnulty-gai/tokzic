import { createAsyncThunk } from '@reduxjs/toolkit';
import { videoMetadataService } from '../../services/video-metadata';
import { videoInteractionService } from '../../services/video-interactions';
import { createLogger } from '../../utils/logger';
import type { VideoMetadata, Comment } from '../../types/firestore';

const logger = createLogger('VideoThunks');

export const fetchVideoMetadata = createAsyncThunk(
  'video/fetchMetadata',
  async (videoId: string) => {
    try {
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

export const fetchVideoComments = createAsyncThunk(
  'video/fetchComments',
  async (videoId: string) => {
    try {
      logger.info('Fetching video comments', { videoId });
      const comments = await videoInteractionService.fetchComments(videoId);
      return { videoId, comments };
    } catch (error) {
      logger.error('Failed to fetch video comments', { videoId, error });
      throw error;
    }
  }
);

export const addVideoComment = createAsyncThunk(
  'video/addComment',
  async ({ videoId, userId, text, userInfo }: {
    videoId: string;
    userId: string;
    text: string;
    userInfo: { username: string; avatarUrl?: string };
  }) => {
    try {
      logger.info('Adding video comment', { videoId, userId });
      await videoInteractionService.addComment(videoId, userId, text, userInfo);
      return { videoId, userId, text, userInfo };
    } catch (error) {
      logger.error('Failed to add video comment', { videoId, userId, error });
      throw error;
    }
  }
);

export const toggleVideoLike = createAsyncThunk(
  'video/toggleLike',
  async ({ videoId, userId }: { videoId: string; userId: string }) => {
    try {
      logger.info('Toggling video like', { videoId, userId });
      const isLiked = await videoInteractionService.toggleLike(videoId, userId);
      return { videoId, userId, isLiked };
    } catch (error) {
      logger.error('Failed to toggle video like', { videoId, userId, error });
      throw error;
    }
  }
);

export const toggleVideoDislike = createAsyncThunk(
  'video/toggleDislike',
  async ({ videoId, userId }: { videoId: string; userId: string }) => {
    try {
      logger.info('Toggling video dislike', { videoId, userId });
      const isDisliked = await videoInteractionService.toggleDislike(videoId, userId);
      return { videoId, userId, isDisliked };
    } catch (error) {
      logger.error('Failed to toggle video dislike', { videoId, userId, error });
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