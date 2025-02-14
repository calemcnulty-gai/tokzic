import type { ThunkAction, Action } from '@reduxjs/toolkit';
import type { ThunkDispatch } from 'redux-thunk';
import type { WritableDraft } from 'immer/dist/types/types-external';

// Firebase types
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';
import type { User } from '../types/auth';

// Internal types
import type { RouteType } from './slices/navigationSlice';
import type { VideoData, VideoWithMetadata } from '../types/video';
import type { VideoMetadata, Comment, Like, Dislike, Tip } from '../types/firestore';
import type { InteractionLoadingState } from '../types/interactions';
import type { UIState } from './slices/uiSlice';
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
  interaction: import('../types/interactions').InteractionState;
  ui: UIState;
  firebase: FirebaseState;
}

// Firebase State Type
export interface FirebaseState extends LoadingState {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  analytics: Analytics | null;
  isInitialized: boolean;
  isInitializing: boolean;
  user: User | null;
  authService: AuthService | null;
  firestoreService: FirestoreService | null;
  storageService: StorageService | null;
  cache: CacheState;
  uploadProgress: Record<string, number>;
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
export interface VideoState extends LoadingState {
  videos: VideoWithMetadata[];
  currentVideo: VideoWithMetadata | null;
  currentIndex: number;
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  isRefreshing: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
  isInitialized: boolean;
  isVideosLoaded: boolean;
  isMetadataLoaded: boolean;
  loadingStates: {
    metadata: LoadingState;
    video: LoadingState;
  };
  errors: {
    metadata?: string;
    view?: string;
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
    pendingGenerations: string[];
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

// Cache State
export interface CacheState {
  documents: Record<string, CacheEntry<DocumentData>>;
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
export interface AuthState extends LoadingState {
  isInitialized: boolean;      // Whether auth has been initialized
  isAuthenticated: boolean;    // Whether user is authenticated
  user: User | null;           // Current user
  loadingStates: {
    isInitializing: boolean;   // Auth system is initializing
    isSigningIn: boolean;      // Sign in is in progress
    isSigningUp: boolean;      // Sign up is in progress
    isSigningOut: boolean;     // Sign out is in progress
  };
  errors: {
    signIn?: string;          // Sign in error if any
    signUp?: string;          // Sign up error if any
    signOut?: string;         // Sign out error if any
  };
}

// Gesture State
export interface GestureState extends LoadingState {
  isDoubleTapEnabled: boolean;
  isSwipeEnabled: boolean;
  doubleTapSide: 'left' | 'right' | null;
  swipeDirection: 'up' | 'down' | 'left' | 'right' | null;
  gestureInProgress: boolean;
  lastGestureTimestamp: number;
}

// Navigation State
export interface NavigationState extends LoadingState {
  currentRoute: RouteType;
  previousRoute: RouteType | null;
  navigationHistory: RouteType[];
  deepLinkPending: string | null;
  isNavigating: boolean;
  authRequiredRoutes: RouteType[];
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