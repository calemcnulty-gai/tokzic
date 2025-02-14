// Base type for new Firestore documents
export interface NewDocument {
  createdAt: number;
}

// Base type for stored Firestore documents
export interface StoredDocument extends NewDocument {
  id: string;
}

// Video metadata types
export interface NewVideoMetadata extends NewDocument {
  creatorId: string;
  title?: string;
  description?: string;
  creator?: {
    username: string;
  };
  stats: {
    views: number;
    likes: number;
    superLikes?: number;
    dislikes?: number;
    superDislikes?: number;
    comments?: number;
    tips?: number;
    penalties?: number;
  };
}

export interface VideoMetadata extends StoredDocument, NewVideoMetadata {}

// Comment types
export interface NewComment extends NewDocument {
  text: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  videoId: string;
}

export interface Comment extends StoredDocument, NewComment {}

// Like types
export interface NewLike extends NewDocument {
  videoId: string;
  userId: string;
  type: 'like' | 'superLike';
}

export interface Like extends StoredDocument, NewLike {}

// Dislike types
export interface NewDislike extends NewDocument {
  videoId: string;
  userId: string;
  type: 'dislike' | 'superDislike';
}

export interface Dislike extends StoredDocument, NewDislike {}

// Tip types
export interface NewTip extends NewDocument {
  videoId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  message?: string;
  type: 'regular' | 'toxic';
}

export interface Tip extends StoredDocument, NewTip {}

// Swipe types
export interface NewSwipe extends NewDocument {
  videoId: string;
  userId: string;
  direction: 'left' | 'right';
}

export interface Swipe extends StoredDocument, NewSwipe {}

export enum Collections {
  VIDEOS = 'videos',
  COMMENTS = 'comments',
  LIKES = 'likes',
  DISLIKES = 'dislikes',
  TIPS = 'tips',
  USERS = 'users',
  SWIPES = 'swipes',
  NEGATIVE_TIPS = 'negative_tips',
}

export interface VideoStats {
  views: number;
  likes: number;
  dislikes: number;
  tips: number;
  negativeTips: number;
  comments: number;
} 