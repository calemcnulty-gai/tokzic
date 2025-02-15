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