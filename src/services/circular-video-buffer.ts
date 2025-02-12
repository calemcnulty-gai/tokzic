import type { VideoData, VideoWithMetadata } from '../types/video';
import { videoService } from './video';
import { VideoMetadata } from '../types/firestore';
import { videoCacheManager } from './video-cache';
import { operationQueue } from './operation-queue';
import { createLogger } from '../utils/logger';

const logger = createLogger('CircularVideoBuffer');

const BUFFER_SIZE = 5;
const MIDDLE_INDEX = Math.floor(BUFFER_SIZE / 2);
const OPERATION_TIMEOUT = 5000; // 5 seconds timeout for operations

// Resource lock keys
const BUFFER_ROTATE_LOCK = 'buffer_rotate';
const BUFFER_PRELOAD_LOCK = 'buffer_preload';
const BUFFER_ADD_LOCK = 'buffer_add';

export class CircularVideoBuffer {
  private videos: VideoWithMetadata[] = [];
  private currentIndex: number = MIDDLE_INDEX;
  private isAtStart: boolean = false;
  private isAtEnd: boolean = false;

  /**
   * Creates a new CircularVideoBuffer with the given videos
   * @param videos Initial videos to populate the buffer with
   * @param metadata Metadata for the videos
   */
  constructor(videos: VideoData[], metadata: VideoMetadata[]) {
    logger.info('Initializing CircularVideoBuffer', {
      totalVideos: videos.length,
      totalMetadata: metadata.length,
      bufferSize: BUFFER_SIZE,
      middleIndex: MIDDLE_INDEX
    });

    // Ensure we have enough videos to fill the buffer
    if (videos.length < BUFFER_SIZE) {
      throw new Error(`Need at least ${BUFFER_SIZE} videos to initialize buffer`);
    }

    // Take the middle video and get surrounding videos
    const middleVideoIndex = Math.floor(videos.length / 2);
    const startIndex = Math.max(0, middleVideoIndex - MIDDLE_INDEX);
    const bufferVideos = videos.slice(startIndex, startIndex + BUFFER_SIZE);

    logger.info('Buffer initialization', {
      middleVideoIndex,
      startIndex,
      selectedVideos: bufferVideos.map(v => v.id)
    });

    this.videos = bufferVideos.map(video => ({
      video,
      metadata: metadata.find(m => m.id === video.id) || this.createDefaultMetadata(video.id)
    }));

    // Start preloading all videos in the buffer
    void this.preloadAllVideos();
  }

  /**
   * Gets the currently playing video
   */
  getCurrentVideo(): VideoWithMetadata {
    const current = this.videos[this.currentIndex];
    logger.info('Current video state', {
      id: current.video.id,
      index: this.currentIndex,
      totalInBuffer: this.videos.length,
      isAtStart: this.isAtStart,
      isAtEnd: this.isAtEnd
    });
    return current;
  }

  /**
   * Gets all videos in the buffer
   */
  getAllVideos(): VideoWithMetadata[] {
    return this.videos;
  }

  /**
   * Gets the index of the currently playing video
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Checks if we're at the start of the video list
   */
  getIsAtStart(): boolean {
    return this.isAtStart;
  }

  /**
   * Checks if we're at the end of the video list
   */
  getIsAtEnd(): boolean {
    return this.isAtEnd;
  }

  /**
   * Rotates the buffer forward and fetches the next video if needed
   */
  async rotateForward(): Promise<void> {
    return operationQueue.enqueue('rotate-forward', async () => {
      logger.info('Rotating buffer forward', {
        currentIndex: this.currentIndex,
        currentVideoId: this.videos[this.currentIndex]?.video.id,
        isAtEnd: this.isAtEnd
      });

      if (this.isAtEnd) {
        logger.info('At end of video list');
        return;
      }

      try {
        // If we're at or past the middle, we need to fetch the next video
        if (this.currentIndex >= MIDDLE_INDEX) {
          const lastVideo = this.videos[this.videos.length - 1].video;
          const nextVideos = await videoService.fetchVideosAfter(1, lastVideo.id);
          
          if (nextVideos.length === 0) {
            this.isAtEnd = true;
            logger.info('Reached end of video list');
            return;
          }

          // Remove first video and add new one to end
          this.videos.shift();
          await this.addVideo(nextVideos[0].video);
          this.currentIndex--;
        }

        // Move to next video
        this.currentIndex++;
        this.isAtStart = false;

        const currentVideo = this.videos[this.currentIndex];
        logger.info('Rotated to new video', {
          id: currentVideo.video.id,
          newIndex: this.currentIndex,
          bufferState: this.videos.map(v => v.video.id)
        });

        // Preload adjacent videos in the background
        void this.preloadAdjacentVideos();
      } catch (error) {
        logger.error('Error rotating buffer forward', { error });
        throw error;
      }
    }, OPERATION_TIMEOUT, [BUFFER_ROTATE_LOCK]);
  }

  /**
   * Rotates the buffer backward and fetches the previous video if needed
   */
  async rotateBackward(): Promise<void> {
    return operationQueue.enqueue('rotate-backward', async () => {
      logger.info('Rotating buffer backward', {
        currentIndex: this.currentIndex,
        currentVideoId: this.videos[this.currentIndex]?.video.id,
        isAtStart: this.isAtStart
      });

      if (this.isAtStart) {
        logger.info('At start of video list');
        return;
      }

      try {
        // If we're at or before the middle, we need to fetch the previous video
        if (this.currentIndex <= MIDDLE_INDEX) {
          const firstVideo = this.videos[0].video;
          const prevVideos = await videoService.fetchVideosBefore(1, firstVideo.id);
          
          if (prevVideos.length === 0) {
            this.isAtStart = true;
            logger.info('Reached start of video list');
            return;
          }

          // Remove last video and add new one to start
          this.videos.pop();
          await this.addVideo(prevVideos[0].video, true);
          this.currentIndex++;
        }

        // Move to previous video
        this.currentIndex--;
        this.isAtEnd = false;

        logger.info('Rotated to new video', {
          id: this.videos[this.currentIndex].video.id,
          newIndex: this.currentIndex,
          bufferState: this.videos.map(v => v.video.id)
        });

        // Preload adjacent videos in the background
        void this.preloadAdjacentVideos();
      } catch (error) {
        logger.error('Error rotating buffer backward', { error });
        throw error;
      }
    }, OPERATION_TIMEOUT, [BUFFER_ROTATE_LOCK]);
  }

  /**
   * Preloads all videos in the buffer
   */
  private async preloadAllVideos(): Promise<void> {
    return operationQueue.enqueue('preload-all', async () => {
      logger.info('Preloading all videos in buffer', {
        videos: this.videos.map(v => v.video.id)
      });

      const preloadPromises = this.videos.map(async ({ video }) => {
        if (!video.url) {
          logger.warn('Missing URL for video', { videoId: video.id });
          return;
        }
        try {
          await videoCacheManager.preloadVideo({
            id: video.id,
            url: video.url,
            createdAt: video.createdAt
          });
        } catch (error) {
          logger.error('Error preloading video', { videoId: video.id, error });
        }
      });

      await Promise.all(preloadPromises);
      logger.info('Completed preloading all videos');
    }, OPERATION_TIMEOUT, [BUFFER_PRELOAD_LOCK]);
  }

  /**
   * Preloads videos adjacent to the current video
   */
  private async preloadAdjacentVideos(): Promise<void> {
    return operationQueue.enqueue('preload-adjacent', async () => {
      const adjacentVideos = [];
      const preloadPromises: Promise<void>[] = [];

      // Preload next video if available
      if (this.currentIndex < this.videos.length - 1) {
        const nextVideo = this.videos[this.currentIndex + 1].video;
        if (nextVideo.url) {
          adjacentVideos.push(nextVideo.id);
          preloadPromises.push(videoCacheManager.preloadVideo(nextVideo).then(() => {}));
        }
      }

      // Preload previous video if available
      if (this.currentIndex > 0) {
        const prevVideo = this.videos[this.currentIndex - 1].video;
        if (prevVideo.url) {
          adjacentVideos.push(prevVideo.id);
          preloadPromises.push(videoCacheManager.preloadVideo(prevVideo).then(() => {}));
        }
      }

      logger.info('Preloading adjacent videos', { 
        currentVideo: this.videos[this.currentIndex].video.id,
        adjacentVideos 
      });

      try {
        await Promise.all(preloadPromises);
        logger.info('Completed preloading adjacent videos');
      } catch (error) {
        logger.error('Error preloading adjacent videos', { error });
      }
    }, OPERATION_TIMEOUT, [BUFFER_PRELOAD_LOCK]);
  }

  /**
   * Adds a video to the buffer
   */
  private async addVideo(video: VideoData, addToStart: boolean = false): Promise<void> {
    return operationQueue.enqueue('add-video', async () => {
      logger.info('Adding video to buffer', { 
        videoId: video.id, 
        addToStart,
        currentBufferSize: this.videos.length
      });
      
      const videoWithMetadata: VideoWithMetadata = {
        video,
        metadata: this.createDefaultMetadata(video.id)
      };

      if (addToStart) {
        this.videos.unshift(videoWithMetadata);
      } else {
        this.videos.push(videoWithMetadata);
      }

      // Start preloading the video if it has a URL
      if (video.url) {
        void videoCacheManager.preloadVideo(video);
        logger.info('Started preloading new video', { videoId: video.id });
      } else {
        logger.warn('Cannot preload video - missing URL', { videoId: video.id });
      }
    }, OPERATION_TIMEOUT, [BUFFER_ADD_LOCK]);
  }

  private createDefaultMetadata(videoId: string): VideoMetadata {
    return {
      id: videoId,
      creatorId: '',
      createdAt: Date.now(),
      stats: {
        views: 0,
        likes: 0
      }
    };
  }
} 