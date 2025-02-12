import type { ThunkAction, Action } from '@reduxjs/toolkit';
import type { ThunkDispatch } from 'redux-thunk';

// Firebase types
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';

// Internal types
import type { RouteType } from './slices/navigationSlice';
import type { VideoData, VideoWithMetadata } from '../types/video';
import type { 
  VideoMetadata, 
  Comment, 
  Like, 
  Dislike, 
  Tip
} from '../types/firestore';
import type {
  FirestoreService,
  StorageService,
  AuthService,
} from './slices/firebase/services';

// Root State Types
export interface RootState {
  auth: AuthState;
  video: VideoState;
  gesture: GestureState;
  navigation: NavigationState;
  interaction: InteractionState;
  ui: UIState;
  firebase: FirebaseState;
}

// Firebase State Type
export interface FirebaseState {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  analytics: Analytics | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  authService: AuthService | null;
  firestoreService: FirestoreService | null;
  storageService: StorageService | null;
  cache: CacheState;
  loadingStates: {
    auth: {
      isInitializing: boolean;
      isSigningIn: boolean;
      isSigningUp: boolean;
      isSigningOut: boolean;
    };
    firestore: {
      isFetching: boolean;
      isUpdating: boolean;
      isDeleting: boolean;
      isBatchProcessing: boolean;
    };
    storage: {
      isUploading: boolean;
      isDownloading: boolean;
      isDeleting: boolean;
      isListing: boolean;
      isUpdatingMetadata: boolean;
    };
    analytics: {
      isLoggingEvent: boolean;
      isUpdatingUserProperties: boolean;
      isTrackingScreen: boolean;
    };
  };
}

// Loading State Interface
export interface LoadingState {
  isLoading: boolean;  // Currently loading
  isLoaded: boolean;   // Successfully loaded
  error: string | null;  // Any error that occurred
}

// Video State
export interface VideoState {
  videos: VideoWithMetadata[];
  currentVideo: VideoWithMetadata | null;
  currentIndex: number;
  lastVisible: QueryDocumentSnapshot<unknown> | null;
  isLoading: boolean;
  isLoaded: boolean;
  isRefreshing: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
  isInitialized: boolean;
  isVideosLoaded: boolean;
  isMetadataLoaded: boolean;
  loadingStates: {
    metadata: LoadingState;
    comments: LoadingState;
    likes: LoadingState;
    tips: LoadingState;
    video: LoadingState;
  };
  error: string | null;
  errors: {
    metadata?: string;
    comments?: string;
    like?: string;
    dislike?: string;
    view?: string;
  };
  interactions: {
    [videoId: string]: VideoInteractionState;
  };
  swipeState: {
    isSwipeInProgress: boolean;
    lastSwipeTime: number;
  };
  player: VideoPlayerState;
  feed: {
    activeIndex: number;
    mountTime: number;
    lastIndexChangeTime: number;
  };
}

// Video Player State
export interface VideoPlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  position: number;
  duration: number;
  isBuffering: boolean;
}

// Video Interaction State
export interface VideoInteractionState {
  isLiked: boolean;
  isDisliked: boolean;
  comments: Comment[];
}

// Cache State
export interface CacheState {
  documents: Record<string, CacheEntry<any>>;
  metadata: Record<string, CacheEntry<VideoMetadata>>;
  comments: Record<string, CacheEntry<Comment[]>>;
  likes: Record<string, CacheEntry<Like[]>>;
  dislikes: Record<string, CacheEntry<Dislike[]>>;
  tips: Record<string, CacheEntry<Tip[]>>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Auth State
export interface AuthState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
}

// Gesture State
export interface GestureState {
  isDoubleTapEnabled: boolean;
  isSwipeEnabled: boolean;
  doubleTapSide: 'left' | 'right' | null;
  swipeDirection: 'up' | 'down' | 'left' | 'right' | null;
  gestureInProgress: boolean;
  lastGestureTimestamp: number;
}

// Navigation State
export interface NavigationState {
  currentRoute: RouteType;
  previousRoute: RouteType | null;
  navigationHistory: RouteType[];
  deepLinkPending: string | null;
  isNavigating: boolean;
  authRequiredRoutes: RouteType[];
}

// Interaction State
export interface InteractionState {
  comments: Record<string, Comment[]>;
  likes: Record<string, Like[]>;
  dislikes: Record<string, Dislike[]>;
  tips: Record<string, Tip[]>;
  isLoading: boolean;
  error: string | null;
}

// UI State
export interface UIState {
  theme: 'light' | 'dark';
  isFullscreen: boolean;
  isSidebarOpen: boolean;
  isCommentsVisible: boolean;
  isOverlayVisible: boolean;
  isTipSelectorVisible: boolean;
  activeModal: string | null;
  toasts: Toast[];
  loadingStates: {
    isLoadingComments: boolean;
    isSubmittingComment: boolean;
    isProcessingTip: boolean;
    isProcessingLike: boolean;
  };
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

// Redux Thunk types
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

// Performance Monitoring Types
export interface PerformanceMetrics {
  timestamp: number;
  actionType: string;
  duration: number;
  metadata?: Record<string, any>;
}

export interface ErrorMetrics {
  timestamp: number;
  error: Error;
  actionType?: string;
  metadata?: Record<string, any>;
}

// Dispatch type
export type AppDispatch = ThunkDispatch<RootState, unknown, Action>;

export type GetState = () => RootState;

export type ThunkConfig = {
  state: RootState;
  rejectValue: Error;
}; 