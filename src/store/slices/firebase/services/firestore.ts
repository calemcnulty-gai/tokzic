import { 
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  Query,
  DocumentReference,
  WhereFilterOp,
  OrderByDirection,
  WriteBatch,
  QueryConstraint
} from 'firebase/firestore';
import { createLogger } from '../../../../utils/logger';
import { Collections } from '../../../../types/firebase';
import type { 
  Comment, 
  Like, 
  Dislike, 
  Tip,
  VideoMetadata 
} from '../../../../types/firestore';

const logger = createLogger('FirestoreService');

/**
 * Type-safe query constraints
 */
export interface QueryOptions {
  where?: {
    field: string;
    operator: WhereFilterOp;
    value: any;
  }[];
  orderBy?: {
    field: string;
    direction?: OrderByDirection;
  }[];
  limit?: number;
}

export interface FirestoreServiceState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Manages Firestore database operations
 */
export class FirestoreService {
  private db: Firestore;
  private activeBatch: WriteBatch | null = null;
  private state: FirestoreServiceState = {
    isLoading: false,
    isInitialized: false,
    error: null
  };

  constructor(db: Firestore) {
    this.db = db;
    this.state.isInitialized = true;
  }

  getState(): FirestoreServiceState {
    return { ...this.state };
  }

  private async withLoadingState<T>(operation: () => Promise<T>): Promise<T> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      return await operation();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Operation failed';
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Converts QueryOptions to Firebase QueryConstraints
   */
  private createQueryConstraints(options: QueryOptions): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    if (options.where) {
      options.where.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value));
      });
    }

    if (options.orderBy) {
      options.orderBy.forEach(({ field, direction = 'asc' }) => {
        constraints.push(orderBy(field, direction));
      });
    }

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    return constraints;
  }

  /**
   * Generic method to fetch documents from a collection
   */
  private async fetchDocuments<T extends DocumentData & { id: string }>(
    collectionName: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    return this.withLoadingState(async () => {
      const collectionRef = collection(this.db, collectionName);
      const constraints = this.createQueryConstraints(options);
      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
        } as T;
      });
    });
  }

  /**
   * Generic method to add a document to a collection
   */
  private async addDocument<T extends DocumentData & { id: string }>(
    collectionName: string,
    data: Omit<T, 'id'>
  ): Promise<T> {
    return this.withLoadingState(async () => {
      const collectionRef = collection(this.db, collectionName);
      const docRef = await addDoc(collectionRef, data);
      return {
        ...data,
        id: docRef.id,
      } as T;
    });
  }

  /**
   * Generic method to fetch a single document
   */
  public async fetchDocument<T extends DocumentData & { id: string }>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    return this.withLoadingState(async () => {
      const docRef = doc(this.db, collectionName, documentId);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) {
        return null;
      }

      return {
        ...snapshot.data(),
        id: snapshot.id,
      } as T;
    });
  }

  /**
   * Generic method to update a document
   */
  public async updateDocument<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ): Promise<void> {
    return this.withLoadingState(async () => {
      const docRef = doc(this.db, collectionName, documentId);
      await updateDoc(docRef, data as DocumentData);
    });
  }

  /**
   * Generic method to delete a document
   */
  public async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    return this.withLoadingState(async () => {
      const docRef = doc(this.db, collectionName, documentId);
      await deleteDoc(docRef);
    });
  }

  // Comments
  async fetchVideoComments(videoId: string): Promise<Comment[]> {
    logger.info('Fetching video comments', { videoId });
    return this.fetchDocuments<Comment>(Collections.COMMENTS, {
      where: [{
        field: 'videoId',
        operator: '==',
        value: videoId
      }],
      orderBy: [{
        field: 'timestamp',
        direction: 'desc'
      }]
    });
  }

  async addComment(comment: Omit<Comment, 'id'>): Promise<Comment> {
    logger.info('Adding comment', { videoId: comment.videoId });
    return this.addDocument<Comment>(Collections.COMMENTS, comment);
  }

  // Likes
  async fetchVideoLikes(videoId: string): Promise<Like[]> {
    logger.info('Fetching video likes', { videoId });
    return this.fetchDocuments<Like>(Collections.LIKES, {
      where: [{
        field: 'videoId',
        operator: '==',
        value: videoId
      }]
    });
  }

  async toggleLike(
    videoId: string,
    userId: string,
    type: 'like' | 'superLike' = 'like'
  ): Promise<{ action: 'add' | 'remove'; like?: Like; likeId?: string }> {
    logger.info('Toggling like', { videoId, userId, type });
    
    // Check if like exists
    const likes = await this.fetchVideoLikes(videoId);
    const existingLike = likes.find(like => like.userId === userId);

    if (existingLike) {
      // Remove like
      await this.deleteDocument(Collections.LIKES, existingLike.id);
      return { action: 'remove', likeId: existingLike.id };
    } else {
      // Add like
      const like = await this.addDocument<Like>(Collections.LIKES, {
        videoId,
        userId,
        type,
        createdAt: Date.now()
      });
      return { action: 'add', like };
    }
  }

  // Dislikes
  async fetchVideoDislikes(videoId: string): Promise<Dislike[]> {
    logger.info('Fetching video dislikes', { videoId });
    return this.fetchDocuments<Dislike>(Collections.DISLIKES, {
      where: [{
        field: 'videoId',
        operator: '==',
        value: videoId
      }]
    });
  }

  async toggleDislike(
    videoId: string,
    userId: string,
    type: 'dislike' | 'superDislike' = 'dislike'
  ): Promise<{ action: 'add' | 'remove'; dislike?: Dislike; dislikeId?: string }> {
    logger.info('Toggling dislike', { videoId, userId, type });
    
    // Check if dislike exists
    const dislikes = await this.fetchVideoDislikes(videoId);
    const existingDislike = dislikes.find(dislike => dislike.userId === userId);

    if (existingDislike) {
      // Remove dislike
      await this.deleteDocument(Collections.DISLIKES, existingDislike.id);
      return { action: 'remove', dislikeId: existingDislike.id };
    } else {
      // Add dislike
      const dislike = await this.addDocument<Dislike>(Collections.DISLIKES, {
        videoId,
        userId,
        type,
        createdAt: Date.now()
      });
      return { action: 'add', dislike };
    }
  }

  // Video Metadata
  async fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    logger.info('Fetching video metadata', { videoId });
    try {
      const docRef = doc(this.db, Collections.VIDEO_METADATA, videoId);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) {
        return null;
      }

      return { id: snapshot.id, ...snapshot.data() } as VideoMetadata;
    } catch (error) {
      logger.error('Failed to fetch video metadata', { videoId, error });
      throw error;
    }
  }

  async updateVideoMetadata(
    videoId: string, 
    updates: Partial<Omit<VideoMetadata, 'id'>>
  ): Promise<void> {
    logger.info('Updating video metadata', { videoId, updates });
    try {
      const docRef = doc(this.db, Collections.VIDEO_METADATA, videoId);
      await updateDoc(docRef, updates);
    } catch (error) {
      logger.error('Failed to update video metadata', { videoId, error });
      throw error;
    }
  }

  // Tips
  async fetchVideoTips(videoId: string): Promise<Tip[]> {
    logger.info('Fetching video tips', { videoId });
    return this.fetchDocuments<Tip>(Collections.TIPS, {
      where: [{
        field: 'videoId',
        operator: '==',
        value: videoId
      }],
      orderBy: [{
        field: 'timestamp',
        direction: 'desc'
      }]
    });
  }

  async addTip(tip: Omit<Tip, 'id'>): Promise<Tip> {
    logger.info('Adding tip', { videoId: tip.videoId });
    return this.addDocument<Tip>(Collections.TIPS, tip);
  }

  /**
   * Starts a new batch operation
   */
  startBatch(): void {
    if (this.activeBatch) {
      throw new Error('A batch operation is already in progress');
    }
    this.activeBatch = writeBatch(this.db);
  }

  /**
   * Commits the current batch operation
   */
  async commitBatch(): Promise<void> {
    if (!this.activeBatch) {
      throw new Error('No batch operation in progress');
    }
    
    try {
      await this.activeBatch.commit();
    } finally {
      this.activeBatch = null;
    }
  }

  /**
   * Adds a document to the current batch
   */
  addToBatch<T extends DocumentData>(
    collectionName: string,
    data: Omit<T, 'id'>
  ): string {
    if (!this.activeBatch) {
      throw new Error('No batch operation in progress');
    }

    const docRef = doc(collection(this.db, collectionName));
    this.activeBatch.set(docRef, data);
    return docRef.id;
  }

  /**
   * Updates a document in the current batch
   */
  updateInBatch<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ): void {
    if (!this.activeBatch) {
      throw new Error('No batch operation in progress');
    }

    const docRef = doc(this.db, collectionName, documentId);
    this.activeBatch.update(docRef, data as DocumentData);
  }

  /**
   * Deletes a document in the current batch
   */
  deleteInBatch(
    collectionName: string,
    documentId: string
  ): void {
    if (!this.activeBatch) {
      throw new Error('No batch operation in progress');
    }

    const docRef = doc(this.db, collectionName, documentId);
    this.activeBatch.delete(docRef);
  }
} 