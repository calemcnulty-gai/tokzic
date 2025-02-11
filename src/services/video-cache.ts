import { Video } from './video';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { operationQueue } from './operation-queue';
import { createLogger } from '../utils/logger';

const logger = createLogger('VideoCacheService');

const CACHE_DIR = `${FileSystem.cacheDirectory}video-cache/`;
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Resource lock keys
const CACHE_INIT_LOCK = 'cache_init';
const CACHE_CLEANUP_LOCK = 'cache_cleanup';
const getVideoLock = (videoId: string) => `video_${videoId}`;

interface CacheEntry {
  uri: string;
  size: number;
  lastAccessed: number;
  isPreloading: boolean;
}

class VideoCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private currentCacheSize: number = 0;
  private isInitialized: boolean = false;
  private activeVideoIds: Set<string> = new Set();

  constructor() {
    this.initializeCache();
  }

  setActiveVideos(videoIds: string[]) {
    logger.info('Setting active videos', { 
      videoIds,
      previousActive: Array.from(this.activeVideoIds),
      cacheSize: this.currentCacheSize
    });
    this.activeVideoIds = new Set(videoIds);
    // Trigger cache optimization with high priority
    operationQueue.enqueue(
      'optimize-cache',
      () => this.optimizeCache(videoIds),
      2,
      [CACHE_CLEANUP_LOCK]
    );
  }

  private async initializeCache() {
    await operationQueue.enqueue(
      'init-cache',
      async () => {
        try {
          logger.info('Initializing video cache');
          // Ensure cache directory exists
          const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
            logger.info('Created cache directory');
          }

          // Clean any stale cache entries
          await this.cleanStaleCache();
          this.isInitialized = true;
          logger.info('Cache initialization complete');
        } catch (error) {
          logger.error('Failed to initialize video cache', { error });
        }
      },
      3,
      [CACHE_INIT_LOCK]
    );
  }

  private async cleanStaleCache() {
    try {
      const entries = await FileSystem.readDirectoryAsync(CACHE_DIR);
      logger.info('Cleaning stale cache entries', { totalEntries: entries.length });
      
      // Clean entries not in active set
      for (const entry of entries) {
        try {
          const videoId = entry.replace('.mp4', '');
          if (!this.activeVideoIds.has(videoId)) {
            const path = `${CACHE_DIR}/${entry}`;
            await FileSystem.deleteAsync(path, { idempotent: true });
            logger.info('Removed stale cache entry', { videoId });
          }
        } catch (error) {
          logger.warn('Failed to clean cache entry', { entry, error });
        }
      }
    } catch (error) {
      logger.error('Failed to clean stale cache', { error });
    }
  }

  private async removeCacheEntry(videoId: string) {
    try {
      const path = `${CACHE_DIR}/${videoId}.mp4`;
      await FileSystem.deleteAsync(path, { idempotent: true });
      logger.info('Removed cache entry', { videoId });
    } catch (error) {
      logger.warn('Failed to remove cache entry', { videoId, error });
    }
  }

  private async ensureCacheSpace(requiredSize: number) {
    return operationQueue.enqueue(
      'ensure-cache-space',
      async () => {
        logger.info('Ensuring cache space', { 
          requiredSize,
          currentSize: this.currentCacheSize,
          maxSize: MAX_CACHE_SIZE
        });

        if (this.currentCacheSize + requiredSize <= MAX_CACHE_SIZE) {
          logger.info('Sufficient cache space available');
          return;
        }

        // Sort cache entries by last accessed time, excluding active videos
        const entries = Array.from(this.cache.entries())
          .filter(([videoId]) => !this.activeVideoIds.has(videoId))
          .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

        logger.info('Cleaning cache to make space', {
          entriesToCheck: entries.length,
          spaceNeeded: requiredSize
        });

        for (const [videoId, entry] of entries) {
          if (entry.isPreloading || this.activeVideoIds.has(videoId)) continue;

          try {
            await FileSystem.deleteAsync(entry.uri, { idempotent: true });
            this.currentCacheSize -= entry.size;
            this.cache.delete(videoId);
            logger.info('Removed cache entry for space', { 
              videoId, 
              freedSpace: entry.size,
              remainingSize: this.currentCacheSize
            });

            if (this.currentCacheSize + requiredSize <= MAX_CACHE_SIZE) {
              logger.info('Sufficient space freed');
              break;
            }
          } catch (error) {
            logger.warn('Failed to remove cache entry', { videoId, error });
            this.cache.delete(videoId);
          }
        }
      },
      2,
      [CACHE_CLEANUP_LOCK]
    );
  }

  async preloadVideo(video: Video): Promise<string> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    if (!video?.url) {
      logger.error('Invalid video URL provided', { videoId: video?.id });
      throw new Error('Invalid video URL provided');
    }

    return operationQueue.enqueue(
      `preload-${video.id}`,
      async () => {
        logger.info('Starting video preload', {
          videoId: video.id,
          url: video.url
        });

        try {
          // Check if already cached
          const cacheUri = `${CACHE_DIR}/${video.id}.mp4`;
          const cacheInfo = await FileSystem.getInfoAsync(cacheUri);

          if (cacheInfo.exists) {
            logger.info('Using cached video', {
              videoId: video.id,
              uri: cacheUri,
              size: cacheInfo.size
            });
            return cacheUri;
          }

          // Not cached, need to download
          logger.info('Starting video download', { 
            videoId: video.id,
            destination: cacheUri 
          });

          const downloadResumable = FileSystem.createDownloadResumable(
            video.url,
            cacheUri,
            {},
            (downloadProgress) => {
              const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
              // Log every 25% to track progress without spam
              if (Math.floor(progress * 4) > Math.floor((progress - 0.01) * 4)) {
                logger.info('Download progress', {
                  videoId: video.id,
                  progress: Math.round(progress * 100),
                  bytesWritten: downloadProgress.totalBytesWritten
                });
              }
            }
          );

          const { uri } = await downloadResumable.downloadAsync();
          if (!uri) {
            throw new Error('Download failed - no URI returned');
          }

          const fileInfo = await FileSystem.getInfoAsync(uri);
          logger.info('Video download complete', { 
            videoId: video.id,
            uri,
            size: fileInfo.size 
          });

          // Update cache entry
          this.cache.set(video.id, {
            uri,
            size: fileInfo.size || 0,
            lastAccessed: Date.now(),
            isPreloading: false
          });

          return uri;
        } catch (error) {
          logger.error('Failed to preload video', {
            videoId: video.id,
            error
          });

          // Clean up failed download
          try {
            await this.removeCacheEntry(video.id);
          } catch (cleanupError) {
            logger.warn('Failed to clean up failed download', { cleanupError });
          }

          throw error;
        }
      },
      2,
      [getVideoLock(video.id)]
    );
  }

  async getCachedUri(videoId: string): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    try {
      const uri = `${CACHE_DIR}/${videoId}.mp4`;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        logger.info('Found cached video', { videoId, uri, size: info.size });
        return uri;
      }
      logger.info('Video not found in cache', { videoId });
      return null;
    } catch (error) {
      logger.error('Failed to get cached URI', { videoId, error });
      return null;
    }
  }

  async clearCache() {
    return operationQueue.enqueue(
      'clear-cache',
      async () => {
        logger.info('Starting cache clear');
        try {
          const entries = await FileSystem.readDirectoryAsync(CACHE_DIR);
          logger.info('Clearing cache entries', { count: entries.length });
          
          await Promise.all(
            entries.map(entry => 
              this.removeCacheEntry(entry.replace('.mp4', '')).catch(error => {
                logger.error('Failed to remove cache entry', {
                  videoId: entry,
                  error
                });
              })
            )
          );
          logger.info('Cache clear complete');
        } catch (error) {
          logger.error('Failed to clear cache', { error });
          throw error;
        }
      },
      2,
      [CACHE_CLEANUP_LOCK]
    );
  }

  private async optimizeCache(activeVideoIds: string[]) {
    return operationQueue.enqueue(
      'optimize-cache',
      async () => {
        const entriesToKeep = new Set(activeVideoIds);
        
        for (const [videoId, entry] of this.cache.entries()) {
          if (!entriesToKeep.has(videoId) && !entry.isPreloading) {
            try {
              await FileSystem.deleteAsync(entry.uri);
              this.currentCacheSize -= entry.size;
              this.cache.delete(videoId);
            } catch (error) {
              console.error(`❌ Failed to remove cache entry for ${videoId}:`, error);
            }
          }
        }
      },
      2,
      [CACHE_CLEANUP_LOCK]
    );
  }
}

export const videoCacheManager = new VideoCacheManager(); 