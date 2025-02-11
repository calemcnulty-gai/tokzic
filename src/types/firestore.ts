export interface VideoMetadata {
  id: string;
  createdAt: number;
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

export interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  timestamp: number;
  videoId: string;
}

export interface Like {
  id: string;
  videoId: string;
  userId: string;
  type: 'like' | 'superLike';
  createdAt: number;
}

export interface Dislike {
  id: string;
  videoId: string;
  userId: string;
  type: 'dislike' | 'superDislike';
  createdAt: number;
}

export interface Tip {
  id: string;
  videoId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  message?: string;
  createdAt: number;
  type: 'regular' | 'toxic';
}

export interface Swipe {
  id: string;
  videoId: string;
  userId: string;
  direction: 'left' | 'right';
  createdAt: number;
}

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