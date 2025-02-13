import { createAsyncThunk } from '@reduxjs/toolkit';
import { createLogger } from '../../../../utils/logger';
import type { RootState } from '../../../';
import type { UploadProgress } from '../services/storage';
import { setUploadProgress, clearUploadProgress } from '../firebaseSlice';
import { serviceManager } from '../services/ServiceManager';

const logger = createLogger('StorageThunks');

export const uploadFile = createAsyncThunk(
  'firebase/storage/uploadFile',
  async ({ 
    path, 
    file,
    metadata
  }: {
    path: string;
    file: Blob | Uint8Array | ArrayBuffer;
    metadata?: Record<string, any>;
  }, { dispatch }) => {
    const storageService = serviceManager.getStorageService();

    if (!storageService) {
      throw new Error('Storage service not initialized');
    }

    try {
      const url = await storageService.uploadFile(
        path,
        file,
        (progress: UploadProgress) => {
          dispatch(setUploadProgress({ path, progress: progress.progress }));
        }
      );

      dispatch(clearUploadProgress({ path }));
      return url;
    } catch (error) {
      dispatch(clearUploadProgress({ path }));
      throw error;
    }
  }
);

export const downloadFile = createAsyncThunk(
  'firebase/storage/downloadFile',
  async (path: string) => {
    const storageService = serviceManager.getStorageService();

    if (!storageService) {
      throw new Error('Storage service not initialized');
    }

    return storageService.getFileUrl(path);
  }
);

export const deleteFile = createAsyncThunk(
  'firebase/storage/deleteFile',
  async (path: string) => {
    const storageService = serviceManager.getStorageService();

    if (!storageService) {
      throw new Error('Storage service not initialized');
    }

    await storageService.deleteFile(path);
  }
);

export const listFiles = createAsyncThunk(
  'firebase/storage/listFiles',
  async ({ 
    path,
    maxResults,
    pageToken
  }: {
    path: string;
    maxResults?: number;
    pageToken?: string;
  }) => {
    const storageService = serviceManager.getStorageService();

    if (!storageService) {
      throw new Error('Storage service not initialized');
    }

    return storageService.listFiles(path, { maxResults, pageToken });
  }
);

export const getFileMetadata = createAsyncThunk(
  'firebase/storage/getFileMetadata',
  async (path: string) => {
    const storageService = serviceManager.getStorageService();

    if (!storageService) {
      throw new Error('Storage service not initialized');
    }

    return storageService.getFileMetadata(path);
  }
);

export const updateFileMetadata = createAsyncThunk(
  'firebase/storage/updateFileMetadata',
  async ({ 
    path, 
    metadata 
  }: {
    path: string;
    metadata: Record<string, any>;
  }) => {
    const storageService = serviceManager.getStorageService();

    if (!storageService) {
      throw new Error('Storage service not initialized');
    }

    return storageService.updateFileMetadata(path, metadata);
  }
);

export const checkFileExists = createAsyncThunk(
  'firebase/storage/checkFileExists',
  async (path: string) => {
    const storageService = serviceManager.getStorageService();

    if (!storageService) {
      throw new Error('Storage service not initialized');
    }

    return storageService.fileExists(path);
  }
); 