import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { videoCacheManager } from '../services/video-cache';
import type { RootState } from '../store';
import { createLogger } from '../utils/logger';
import { VideoData } from '../types/video';

const logger = createLogger('useVideoPreload');

const MAX_PRELOAD_VIDEOS = 2;
const PRELOAD_DEBOUNCE_MS = 500;

export function useVideoPreload() {
  const { videos, currentIndex } = useSelector((state: RootState) => state.video);
  const preloadTimeoutRef = useRef<NodeJS.Timeout>();
  const lastPreloadedVideosRef = useRef<string[]>([]);

  useEffect(() => {
    if (!videos.length) {
      logger.debug('No videos available for preloading');
      return;
    }

    // Clear existing timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Debounce preloading to avoid unnecessary work during rapid scrolling
    preloadTimeoutRef.current = setTimeout(() => {
      const videosToPreload: VideoData[] = [];
      const videoIds: string[] = [];

      // Always preload current video if not already preloaded
      const currentVideo = videos[currentIndex]?.video;
      if (currentVideo && !lastPreloadedVideosRef.current.includes(currentVideo.id)) {
        videosToPreload.push(currentVideo);
        videoIds.push(currentVideo.id);
        logger.debug('Adding current video to preload queue', { videoId: currentVideo.id });
      }

      // Preload next videos if available
      for (let i = 1; i <= MAX_PRELOAD_VIDEOS; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < videos.length) {
          const nextVideo = videos[nextIndex]?.video;
          if (nextVideo && !lastPreloadedVideosRef.current.includes(nextVideo.id)) {
            videosToPreload.push(nextVideo);
            videoIds.push(nextVideo.id);
            logger.debug('Adding next video to preload queue', { 
              videoId: nextVideo.id,
              position: i 
            });
          }
        }
      }

      // Start preloading if we have new videos
      if (videosToPreload.length > 0) {
        logger.info('Starting preload batch', { 
          count: videosToPreload.length,
          videos: videoIds 
        });

        videosToPreload.forEach(video => {
          if (!video.url) {
            logger.warn('Cannot preload video - missing URL', { videoId: video.id });
            return;
          }

          videoCacheManager.preloadVideo(video)
            .then(() => {
              logger.info('Successfully preloaded video', { videoId: video.id });
              lastPreloadedVideosRef.current = [
                ...lastPreloadedVideosRef.current,
                video.id
              ].slice(-MAX_PRELOAD_VIDEOS * 2); // Keep track of last N preloaded videos
            })
            .catch(error => {
              logger.error('Failed to preload video', { videoId: video.id, error });
            });
        });
      }
    }, PRELOAD_DEBOUNCE_MS);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [videos, currentIndex]);
} 