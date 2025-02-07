export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  creatorId: string;
  creator: {
    username: string;
    avatarUrl?: string;
  };
  stats: {
    views: number;
    likes: number;
    superLikes: number;
    dislikes: number;
    superDislikes: number;
    comments: number;
    tips: number;
  };
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  text: string;
  createdAt: number;
  user: {
    username: string;
    avatarUrl?: string;
  };
  likes: number;
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
}

export interface VideoStats {
  views: number;
  likes: number;
  superLikes: number;
  superDislikes: number;
  dislikes: number;
  comments: number;
  tips: number;
} 