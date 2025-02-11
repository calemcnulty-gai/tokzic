import type { ThunkAction, Action } from '@reduxjs/toolkit';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

import type { RouteType } from './slices/navigationSlice';
import type { VideoData } from '../services/video';
import type { VideoMetadata, Comment, Like, Dislike, Tip } from '../types/firestore';

// Root State Types
export interface RootState {
  auth: AuthState;
  feed: FeedState;
  gesture: GestureState;
  navigation: NavigationState;
  interaction: InteractionState;
}

// Auth State
export interface AuthState {
  user: {
    uid: string;
    email: string | null;
    isAnonymous: boolean;
    metadata: {
      creationTime?: string;
      lastSignInTime?: string;
    };
  } | null;
  isLoading: boolean;
  error: string | null;
}

// Feed State
export interface FeedState {
  videos: {
    video: VideoData;
    metadata: VideoMetadata;
  }[];
  lastVisible: any; // Firebase QueryDocumentSnapshot
  isLoading: boolean;
  isRefreshing: boolean;
  hasMoreVideos: boolean;
  error: string | null;
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