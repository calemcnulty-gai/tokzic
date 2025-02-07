# Data Management

## Overview
Implementation of data services and Firestore integration for managing video feed data, including user interactions, engagement tracking, and real-time updates.

## Implemented Features
✅ Firestore Collections
- Videos collection with metadata
- Comments with real-time updates
- Likes/Super Likes tracking
- Tips (regular and toxic)
- Swipes for feed personalization

✅ Security Rules
- Proper authentication checks
- User-specific permissions
- Engagement tracking rules
- Rate limiting for tips

## Data Models

### Video Metadata
```typescript
interface VideoMetadata {
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
    comments: number;
    tips: number;
  };
}
```

### User Interactions
```typescript
interface Like {
  id: string;
  videoId: string;
  userId: string;
  type: 'like' | 'superLike';
  createdAt: number;
}

interface Comment {
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

interface Tip {
  id: string;
  videoId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  message?: string;
  createdAt: number;
  type: 'regular' | 'toxic';
}

interface Swipe {
  id: string;
  videoId: string;
  userId: string;
  direction: 'left' | 'right';
  createdAt: number;
}
```

## Firestore Security Rules
```typescript
// Key security rules implemented:
match /videos/{videoId} {
  allow read: if isAuthenticated();
  allow update: if isAuthenticated() && (
    isOwner(resource.data.creatorId) ||
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['stats'])
  );
}

match /comments/{commentId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}

match /likes/{likeId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && likeId == request.resource.data.videoId + '_' + request.auth.uid;
  allow delete: if isAuthenticated() && likeId == resource.data.videoId + '_' + request.auth.uid;
}

match /tips/{tipId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && isOwner(request.resource.data.fromUserId);
}

match /swipes/{swipeId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

## Firestore Integration

### 1. Collection Structure
```typescript
// config/firestore.ts
const collections = {
  videos: 'videos',
  creators: 'creators',
  engagement: 'engagement',
  analytics: 'analytics',
} as const;

const videoConverter = {
  toFirestore: (video: VideoData) => ({
    // Firestore data structure
  }),
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot) => ({
    // Convert to VideoData
  }),
};
```

### 2. Query Optimization
```typescript
// services/queryOptimizer.ts
interface QueryConfig {
  limit: number;
  orderBy: keyof VideoData;
  filters?: Array<{
    field: string;
    operator: FirebaseFirestore.WhereFilterOp;
    value: any;
  }>;
}

class QueryOptimizer {
  // Methods:
  // - Build optimized queries
  // - Handle pagination
  // - Apply filters
  // - Manage indexes
}
```

## Pagination Implementation

### 1. Cursor-based Pagination
```typescript
// hooks/usePagination.ts
interface PaginationState {
  items: VideoData[];
  lastVisible: FirebaseFirestore.QueryDocumentSnapshot | null;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
}

const usePagination = (pageSize: number) => {
  // Pagination logic:
  // - Load next page
  // - Track cursor position
  // - Handle loading states
  // - Error handling
};
```

### 2. Infinite Scroll
```typescript
// hooks/useInfiniteScroll.ts
interface InfiniteScrollConfig {
  threshold: number;
  batchSize: number;
  maxBatches?: number;
}

const useInfiniteScroll = (config: InfiniteScrollConfig) => {
  // Infinite scroll logic:
  // - Detect scroll position
  // - Trigger pagination
  // - Handle loading states
};
```

## Caching Layer

### 1. Local Cache
```typescript
// services/localCache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class LocalCache {
  // Methods:
  // - Get/set cache entries
  // - Check cache validity
  // - Clear expired entries
  // - Handle cache size limits
}
```

### 2. Persistence Strategy
```typescript
// services/persistence.ts
interface PersistenceConfig {
  maxAge: number;
  maxItems: number;
  persistenceKey: string;
}

class PersistenceManager {
  // Methods:
  // - Save to AsyncStorage
  // - Load from AsyncStorage
  // - Clear persistence
  // - Handle storage limits
}
```

## Real-time Updates

### 1. Subscription Management
```typescript
// services/subscriptionManager.ts
interface Subscription {
  id: string;
  callback: (data: any) => void;
  unsubscribe: () => void;
}

class SubscriptionManager {
  // Methods:
  // - Add subscription
  // - Remove subscription
  // - Batch updates
  // - Handle cleanup
}
```

### 2. Update Optimization
```typescript
// services/updateOptimizer.ts
interface UpdateConfig {
  batchSize: number;
  debounceTime: number;
  maxUpdatesPerSecond: number;
}

class UpdateOptimizer {
  // Methods:
  // - Batch updates
  // - Debounce changes
  // - Rate limit
  // - Prioritize updates
}
```

## Error Handling

### 1. Error Types
```typescript
// types/errors.ts
enum DataErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
}

interface DataError extends Error {
  type: DataErrorType;
  context: Record<string, unknown>;
}
```

### 2. Error Recovery
```typescript
// services/errorRecovery.ts
interface RecoveryStrategy {
  maxRetries: number;
  backoffFactor: number;
  timeout: number;
}

class ErrorRecovery {
  // Methods:
  // - Retry failed operations
  // - Implement backoff strategy
  // - Log errors
  // - Notify monitoring
}
```

## Success Criteria
- [ ] Feed loads within 500ms
- [ ] Smooth infinite scroll
- [ ] Real-time updates working
- [ ] Efficient caching
- [ ] Error recovery implemented
- [ ] Offline support working 