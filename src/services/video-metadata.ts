import { Collections, VideoMetadata, Comment, Like, Tip } from '../types/firestore';
import { createLogger } from '../utils/logger';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  increment,
  addDoc,
  startAfter as firestoreStartAfter,
  type DocumentReference,
  type Query,
  type DocumentData,
  type Firestore,
  deleteDoc
} from 'firebase/firestore';

const logger = createLogger('VideoMetadata');

export class VideoMetadataService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  private getFirestore(): Firestore {
    if (!this.db) {
      logger.error('Firestore not initialized');
      throw new Error('Firestore not initialized');
    }
    return this.db;
  }

  /**
   * Fetches metadata for a list of videos
   */
  async fetchVideosMetadata(videoIds: string[]): Promise<VideoMetadata[]> {
    try {
      const db = this.getFirestore();
      logger.info('Fetching metadata for videos', { count: videoIds.length });
      
      const videosRef = collection(db, Collections.VIDEOS);
      const snapshots = await Promise.all(
        videoIds.map(id => getDoc(doc(videosRef, id)))
      );
      
      const metadata = snapshots
        .filter(snap => snap.exists())
        .map(snap => ({ id: snap.id, ...snap.data() }) as VideoMetadata);

      logger.info('Successfully fetched metadata', { count: metadata.length });
      return metadata;
    } catch (error) {
      logger.error('Error fetching videos metadata', { videoIds, error });
      throw error;
    }
  }

  /**
   * Fetches metadata for a single video
   */
  async fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      const db = this.getFirestore();
      logger.info('Fetching metadata for video', { videoId });
      
      const videoRef = doc(collection(db, Collections.VIDEOS), videoId);
      const snapshot = await getDoc(videoRef);

      if (!snapshot.exists()) {
        logger.info('Video metadata not found', { videoId });
        return null;
      }

      const metadata = { id: snapshot.id, ...snapshot.data() } as VideoMetadata;
      logger.info('Successfully fetched metadata');
      return metadata;
    } catch (error) {
      logger.error('Error fetching video metadata', { videoId, error });
      throw error;
    }
  }

  /**
   * Updates metadata for a video
   */
  async updateVideoMetadata(videoId: string, updates: Partial<VideoMetadata>): Promise<void> {
    try {
      const db = this.getFirestore();
      logger.info('Updating video metadata', { videoId, updates });
      
      const videoRef = doc(collection(db, Collections.VIDEOS), videoId);
      const docSnap = await getDoc(videoRef);
      
      if (docSnap.exists()) {
        await updateDoc(videoRef, {
          ...updates,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }

      logger.info('Successfully updated metadata');
    } catch (error) {
      logger.error('Error updating video metadata', { videoId, updates, error });
      throw error;
    }
  }

  /**
   * Creates default metadata for a video
   */
  async createDefaultMetadata(videoId: string): Promise<void> {
    try {
      logger.info('Creating default metadata for video', { videoId });
      
      const videoRef = doc(collection(this.getFirestore(), Collections.VIDEOS), videoId);
      const metadata: Omit<VideoMetadata, 'id'> = {
        title: "Untitled",
        description: "Sample video for testing",
        createdAt: Date.now(),
        creatorId: "system",
        creator: {
          username: "System"
        },
        stats: {
          views: 0,
          likes: 0,
          dislikes: 0,
          comments: 0,
          tips: 0
        }
      };

      const docSnap = await getDoc(videoRef);
      if (!docSnap.exists()) {
        await setDoc(videoRef, metadata);
      }
      logger.info('Successfully created default metadata');
    } catch (error) {
      logger.error('Error creating default metadata', { videoId, error });
      throw error;
    }
  }

  /**
   * Fetches comments for a video
   */
  async fetchVideoComments(
    videoId: string,
    limitCount = 50,
    startAfter?: number
  ): Promise<Comment[]> {
    try {
      const db = this.getFirestore();
      logger.info(`Fetching comments for video: ${videoId}`);
      
      const commentsRef = collection(db, Collections.COMMENTS);
      const constraints = [
        where('videoId', '==', videoId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];

      if (startAfter) {
        constraints.push(firestoreStartAfter(startAfter));
      }

      const q = query(commentsRef, ...constraints);
      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];

      logger.info(`Fetched ${comments.length} comments`);
      return comments;
    } catch (error) {
      logger.error('Error fetching comments:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Adds a comment to a video
   */
  async addComment(
    videoId: string,
    userId: string,
    text: string,
    userInfo: { username: string; avatarUrl?: string }
  ): Promise<void> {
    try {
      logger.info('Adding comment with params:', {
        videoId,
        userId,
        text,
        userInfo
      });
      
      // Create the comment document with only defined values
      const comment = {
        videoId,
        userId,
        text,
        user: {
          username: userInfo.username,
          ...(userInfo.avatarUrl && { avatarUrl: userInfo.avatarUrl })
        },
        createdAt: Date.now(),
      };

      logger.info('Constructed comment object:', { comment });

      // Add to comments collection
      logger.info('Attempting to add to Firestore...', { videoId });
      await addDoc(collection(this.getFirestore(), Collections.COMMENTS), comment);

      logger.info('Updating comment count...');
      // Update comment count
      const videoRef = doc(collection(this.getFirestore(), Collections.VIDEOS), videoId);
      await updateDoc(videoRef, {
        'stats.comments': increment(1)
      });

      logger.info('Successfully added comment');
    } catch (error) {
      logger.error('Error adding comment:', { error: error instanceof Error ? error.message : 'Unknown error' });
      if (error instanceof Error) {
        logger.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          state: {
            videoId,
            userId,
            text,
            userInfo: JSON.stringify(userInfo)
          }
        });
      }
      throw error;
    }
  }

  /**
   * Sends a tip to a video creator
   */
  async sendTip(
    videoId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<void> {
    try {
      logger.info(`Adding tip of $${amount} to video ${videoId}`);
      const videoRef = doc(collection(this.getFirestore(), Collections.VIDEOS), videoId);
      await updateDoc(videoRef, {
        'stats.tips': increment(amount)
      });
      logger.info('Successfully added tip');
    } catch (error) {
      logger.error('Error sending tip:', { error: error instanceof Error ? error.message : 'Unknown error' });
      if (error instanceof Error) {
        logger.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  /**
   * Increments the view count for a video
   */
  async incrementViewCount(videoId: string): Promise<void> {
    try {
      logger.info('Incrementing view count', { videoId });
      const videoRef = doc(collection(this.getFirestore(), Collections.VIDEOS), videoId);
      const docSnap = await getDoc(videoRef);
      
      if (docSnap.exists()) {
        await updateDoc(videoRef, {
          'stats.views': increment(1)
        });
        logger.info('Successfully incremented view count');
      } else {
        logger.warn('Video not found, cannot increment view count', { videoId });
      }
    } catch (error) {
      logger.error('Error incrementing view count:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Toggles a like/superlike on a video
   */
  async toggleLike(
    videoId: string,
    userId: string,
    type: 'like' | 'superLike' = 'like'
  ): Promise<boolean> {
    try {
      logger.info('Toggling like', { videoId, userId, type });
      
      const likesRef = collection(this.getFirestore(), Collections.LIKES);
      const q = query(likesRef, 
        where('videoId', '==', videoId),
        where('userId', '==', userId),
        where('type', '==', type)
      );
      
      const snapshot = await getDocs(q);
      const videoRef = doc(collection(this.getFirestore(), Collections.VIDEOS), videoId);
      
      if (!snapshot.empty) {
        // Unlike: Remove the like document and decrement count
        const likeDoc = snapshot.docs[0];
        await deleteDoc(doc(likesRef, likeDoc.id));
        
        const videoSnap = await getDoc(videoRef);
        if (videoSnap.exists()) {
          await updateDoc(videoRef, {
            [`stats.${type}s`]: increment(-1)
          });
        }
        return false;
      } else {
        // Like: Add like document and increment count
        const like: Like = {
          videoId,
          userId,
          type,
          createdAt: Date.now()
        };
        
        await addDoc(likesRef, like);
        const videoSnap = await getDoc(videoRef);
        if (videoSnap.exists()) {
          await updateDoc(videoRef, {
            [`stats.${type}s`]: increment(1)
          });
        }
        return true;
      }
    } catch (error) {
      logger.error('Error toggling like:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Toggles a dislike/superDislike on a video
   */
  async toggleDislike(
    videoId: string,
    userId: string,
    type: 'dislike' | 'superDislike' = 'dislike'
  ): Promise<boolean> {
    try {
      logger.info('Toggling dislike', { videoId, userId, type });
      
      const dislikesRef = collection(this.getFirestore(), Collections.DISLIKES);
      const q = query(dislikesRef, 
        where('videoId', '==', videoId),
        where('userId', '==', userId),
        where('type', '==', type)
      );
      
      const snapshot = await getDocs(q);
      const videoRef = doc(collection(this.getFirestore(), Collections.VIDEOS), videoId);
      
      if (!snapshot.empty) {
        // Remove dislike
        const dislikeDoc = snapshot.docs[0];
        await deleteDoc(doc(dislikesRef, dislikeDoc.id));
        
        const videoSnap = await getDoc(videoRef);
        if (videoSnap.exists()) {
          await updateDoc(videoRef, {
            [`stats.${type}s`]: increment(-1)
          });
        }
        return false;
      } else {
        // Add dislike
        const dislike = {
          videoId,
          userId,
          type,
          createdAt: Date.now()
        };
        
        await addDoc(dislikesRef, dislike);
        const videoSnap = await getDoc(videoRef);
        if (videoSnap.exists()) {
          await updateDoc(videoRef, {
            [`stats.${type}s`]: increment(1)
          });
        }
        return true;
      }
    } catch (error) {
      logger.error('Error toggling dislike:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Sends a negative tip (penalty) to a video creator
   */
  async sendNegativeTip(
    videoId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<void> {
    try {
      logger.info(`Adding negative tip of $${amount} to video ${videoId}`);
      const videoRef = doc(collection(this.getFirestore(), Collections.VIDEOS), videoId);
      await updateDoc(videoRef, {
        'stats.tips': increment(-amount)
      });
      logger.info('Successfully added negative tip');
    } catch (error) {
      logger.error('Error sending negative tip:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Fetches recent video metadata
   */
  async fetchRecentMetadata(limitCount: number = 10): Promise<VideoMetadata[]> {
    try {
      const db = this.getFirestore();
      logger.info('Fetching recent metadata', { limit: limitCount });
      
      const videosRef = collection(db, Collections.VIDEOS);
      const q = query(videosRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const metadata = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoMetadata[];

      logger.info('Successfully fetched recent metadata', { count: metadata.length });
      return metadata;
    } catch (error) {
      logger.error('Error fetching recent metadata:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
} 