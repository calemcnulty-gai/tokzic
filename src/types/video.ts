import type { VideoMetadata } from './firestore';

export interface VideoData {
  id: string;
  url: string;
  createdAt: number;
}

export interface VideoWithMetadata {
  video: VideoData;
  metadata: VideoMetadata;
} 