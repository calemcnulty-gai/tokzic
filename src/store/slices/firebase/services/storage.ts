import { 
  FirebaseStorage,
  ref,
  getDownloadURL,
  list,
  uploadBytes,
  uploadBytesResumable,
  deleteObject,
  getMetadata,
  updateMetadata,
  type StorageReference,
  type UploadTaskSnapshot,
  type UploadTask,
  type FullMetadata
} from 'firebase/storage';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger('StorageService');

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
  state: string;
}

export interface StorageServiceState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Manages Firebase Storage operations
 */
export class StorageService {
  private storage: FirebaseStorage;
  private state: StorageServiceState = {
    isLoading: false,
    isInitialized: false,
    error: null
  };

  constructor(storage: FirebaseStorage) {
    this.storage = storage;
    this.state.isInitialized = true;
  }

  getState(): StorageServiceState {
    return { ...this.state };
  }

  private async withLoadingState<T>(operation: () => Promise<T>): Promise<T> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      return await operation();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Operation failed';
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Uploads a file to storage with progress tracking
   */
  async uploadFile(
    path: string,
    file: Blob | Uint8Array | ArrayBuffer,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    return this.withLoadingState(async () => {
      logger.info('Starting file upload', { path });
      const storageRef = ref(this.storage, path);
      
      if (onProgress) {
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot: UploadTaskSnapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                state: snapshot.state
              };
              onProgress(progress);
            },
            (error) => {
              logger.error('Upload failed', { path, error });
              reject(error);
            },
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              } catch (error) {
                logger.error('Failed to get download URL', { path, error });
                reject(error);
              }
            }
          );
        });
      } else {
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
      }
    });
  }

  /**
   * Gets the download URL for a file
   */
  async getFileUrl(path: string): Promise<string> {
    return this.withLoadingState(async () => {
      logger.info('Getting file URL', { path });
      const storageRef = ref(this.storage, path);
      return await getDownloadURL(storageRef);
    });
  }

  /**
   * Deletes a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    return this.withLoadingState(async () => {
      logger.info('Deleting file', { path });
      const storageRef = ref(this.storage, path);
      await deleteObject(storageRef);
    });
  }

  /**
   * Lists files in a directory
   */
  async listFiles(
    path: string,
    options: { maxResults?: number; pageToken?: string } = {}
  ): Promise<{
    items: StorageReference[];
    nextPageToken?: string;
  }> {
    return this.withLoadingState(async () => {
      logger.info('Listing files', { path, options });
      const storageRef = ref(this.storage, path);
      const result = await list(storageRef, options);
      return {
        items: result.items,
        nextPageToken: result.nextPageToken
      };
    });
  }

  /**
   * Checks if a file exists
   */
  async fileExists(path: string): Promise<boolean> {
    return this.withLoadingState(async () => {
      logger.info('Checking file existence', { path });
      try {
        const storageRef = ref(this.storage, path);
        await getDownloadURL(storageRef);
        return true;
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          return false;
        }
        throw error;
      }
    });
  }

  /**
   * Gets metadata for a file
   */
  async getFileMetadata(path: string): Promise<FullMetadata> {
    return this.withLoadingState(async () => {
      logger.info('Getting file metadata', { path });
      const storageRef = ref(this.storage, path);
      return await getMetadata(storageRef);
    });
  }

  /**
   * Updates metadata for a file
   */
  async updateFileMetadata(
    path: string, 
    metadata: Partial<FullMetadata>
  ): Promise<FullMetadata> {
    return this.withLoadingState(async () => {
      logger.info('Updating file metadata', { path });
      const storageRef = ref(this.storage, path);
      return await updateMetadata(storageRef, metadata);
    });
  }
} 