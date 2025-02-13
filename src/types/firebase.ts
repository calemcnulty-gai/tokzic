import type { User as FirebaseUser } from 'firebase/auth';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

// Auth Types
export interface User extends Omit<FirebaseUser, 'metadata'> {
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  customClaims?: {
    [key: string]: any;
  };
}

export type AuthProvider = 'google.com' | 'apple.com' | 'facebook.com' | 'twitter.com' | 'github.com';

export interface AuthError extends Error {
  code: string;
  customData?: Record<string, any>;
}

// Firestore Types
export enum Collections {
  USERS = 'users',
  VIDEOS = 'videos',
  VIDEO_METADATA = 'videoMetadata',
  COMMENTS = 'comments',
  LIKES = 'likes',
  DISLIKES = 'dislikes',
  TIPS = 'tips',
  SWIPES = 'swipes',
  NOTIFICATIONS = 'notifications',
}

export interface BaseDocument {
  id: string;
  createdAt: number;
  updatedAt?: number;
}

export interface VideoMetadata extends BaseDocument {
  creatorId: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  stats: {
    views: number;
    likes: number;
    superLikes?: number;
    dislikes?: number;
    superDislikes?: number;
    comments: number;
    tips: number;
  };
}

export interface Comment extends BaseDocument {
  videoId: string;
  userId: string;
  text: string;
  username: string;
  avatarUrl?: string;
  replyTo?: string;
  likes?: number;
}

export interface Like extends BaseDocument {
  videoId: string;
  userId: string;
  type: 'like' | 'superLike';
}

export interface Dislike extends BaseDocument {
  videoId: string;
  userId: string;
  type: 'dislike' | 'superDislike';
}

export interface Tip extends BaseDocument {
  videoId: string;
  userId: string;
  amount: number;
  currency: string;
  message?: string;
}

export interface Swipe extends BaseDocument {
  videoId: string;
  userId: string;
  direction: 'left' | 'right';
}

export interface QueryOptions {
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  endBefore?: QueryDocumentSnapshot<DocumentData>;
}

// Storage Types
export interface UploadMetadata {
  contentType?: string;
  customMetadata?: Record<string, string>;
}

export interface DownloadMetadata extends UploadMetadata {
  bucket: string;
  fullPath: string;
  generation: string;
  metageneration: string;
  name: string;
  size: number;
  timeCreated: string;
  updated: string;
}

// Analytics Types
export enum AnalyticsEvent {
  // App lifecycle events
  APP_OPEN = 'app_open',
  APP_UPDATE = 'app_update',
  ERROR = 'error',
  FIRST_OPEN = 'first_open',

  // Session events
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',

  // Authentication events
  LOGIN = 'login',
  SIGN_UP = 'sign_up',
  LOGOUT = 'logout',

  // Navigation events
  SCREEN_VIEW = 'screen_view',
  MENU_OPEN = 'menu_open',
  MENU_ITEM_SELECT = 'menu_item_select',

  // Video events
  VIDEO_START = 'video_start',
  VIDEO_COMPLETE = 'video_complete',
  VIDEO_PROGRESS = 'video_progress',
  VIDEO_PAUSE = 'video_pause',
  VIDEO_RESUME = 'video_resume',
  VIDEO_SEEK = 'video_seek',
  VIDEO_QUALITY_CHANGE = 'video_quality_change',
  VIDEO_BUFFERING = 'video_buffering',
  VIDEO_ERROR = 'video_error',

  // Interaction events
  VIDEO_LIKE = 'video_like',
  VIDEO_DISLIKE = 'video_dislike',
  VIDEO_SHARE = 'video_share',
  VIDEO_SAVE = 'video_save',
  COMMENT_CREATE = 'comment_create',
  COMMENT_REPLY = 'comment_reply',
  TIP_SEND = 'tip_send',
  SWIPE_LEFT = 'swipe_left',
  SWIPE_RIGHT = 'swipe_right',

  // Feed events
  FEED_OPEN = 'feed_open',
  FEED_REFRESH = 'feed_refresh',
  FEED_END_REACHED = 'feed_end_reached',
  FEED_FILTER_CHANGE = 'feed_filter_change',
  FEED_SORT_CHANGE = 'feed_sort_change',
  FEED_INITIALIZED = 'feed_initialized',

  // Performance events
  PERFORMANCE_METRIC = 'performance_metric',
}

export interface UserProperties {
  userType?: 'free' | 'premium';
  accountAge?: number;
  videosWatched?: number;
  totalWatchTime?: number;
  engagementScore?: number;
  lastSessionAt?: number;
  sessionCount?: number;
}

// Error Types
export interface FirebaseError extends Error {
  code: string;
  customData?: Record<string, any>;
}

export interface StorageError extends FirebaseError {
  serverResponse?: string;
  bucket?: string;
  object?: string;
}

export interface FirestoreError extends FirebaseError {
  documentId?: string;
  collection?: string;
  operation?: 'read' | 'write' | 'delete' | 'update' | 'query';
}

// Type Guards
export function isFirebaseError(error: unknown): error is FirebaseError {
  return error instanceof Error && 'code' in error;
}

export function isStorageError(error: unknown): error is StorageError {
  return isFirebaseError(error) && ('serverResponse' in error || 'bucket' in error || 'object' in error);
}

export function isFirestoreError(error: unknown): error is FirestoreError {
  return isFirebaseError(error) && ('documentId' in error || 'collection' in error || 'operation' in error);
} 