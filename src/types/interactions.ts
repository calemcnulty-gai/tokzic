// Interaction Types
import type { Comment, Like, Dislike, Tip } from './firestore';
import type { LoadingState } from '../store/types';

export type InteractionType = 'like' | 'superLike' | 'dislike';
export type TipType = 'regular' | 'toxic';

export interface InteractionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Use the central LoadingState type
export type InteractionLoadingState = LoadingState;

export interface InteractionMetrics {
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  tipCount: number;
  lastInteractionTime?: number;
}

export interface VideoInteractionState {
  isLiked: boolean;
  isDisliked: boolean;
  likeCount: number;
  dislikeCount: number;
  comments: Comment[];
  metrics: InteractionMetrics;
  loadingState: InteractionLoadingState;
}

export interface InteractionState {
  comments: Record<string, Comment[]>;
  likes: Record<string, Like[]>;
  dislikes: Record<string, Dislike[]>;
  tips: Record<string, Tip[]>;
  loadingState: InteractionLoadingState;
  loadingStates: {
    comments: LoadingState;
    likes: LoadingState;
    tips: LoadingState;
  };
  errors: {
    comments?: string;
    like?: string;
    dislike?: string;
  };
}

// Base payload type for all interactions
export interface InteractionPayload {
  videoId: string;
  userId: string;
  type?: InteractionType;
  data?: unknown;
}

// Specific payload types
export interface CommentPayload extends Omit<InteractionPayload, 'type'> {
  text: string;
  username: string;
}

export interface TipPayload extends Omit<InteractionPayload, 'type'> {
  amount: number;
  message?: string;
  fromUserId: string;
  toUserId: string;
  type: TipType;
}

export interface LikePayload extends InteractionPayload {
  type: 'like' | 'superLike';
}

export interface DislikePayload extends InteractionPayload {
  type: 'dislike';
}

// Response types
export interface InteractionResponse<T> {
  action: 'add' | 'remove';
  data?: T;
  id?: string;
  videoId: string;
}

export interface VideoInteractionResponse {
  success: boolean;
  data?: {
    isLiked?: boolean;
    isDisliked?: boolean;
    like?: Like;
    dislike?: Dislike;
  };
  error?: string;
}

// Loading state types
export interface InteractionLoadingStates {
  isLoadingComments: boolean;
  isSubmittingComment: boolean;
  isProcessingLike: boolean;
  isProcessingTip: boolean;
}

// UI State for interactions
export interface InteractionUIState {
  isCommentsVisible: boolean;
  isTipSelectorVisible: boolean;
  loadingStates: InteractionLoadingStates;
} 