import { Collections } from '../types/firestore';
import type { 
  VideoMetadata, 
  Comment, 
  Like, 
  Dislike, 
  Tip 
} from '../types/firestore';
import type { 
  InteractionResult,
  VideoInteractionResponse
} from '../types/interactions';
import { createLogger } from '../utils/logger';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
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
  deleteDoc,
  increment,
  writeBatch,
  FirestoreError
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getFirestore } from './firebase';

const logger = createLogger('VideoInteractions');

export class VideoInteractionService {
  private getDb(): Firestore {
    return getFirestore();
  }

  /**
   * Increments view count for a video
   */
  async incrementViewCount(videoId: string): Promise<InteractionResult<void>> {
    try {
      const db = this.getDb();
      const videoRef = doc(db, Collections.VIDEOS, videoId);

      // First try to get the document
      const docSnap = await getDoc(videoRef);

      if (!docSnap.exists()) {
        logger.info('Creating default metadata for video', { videoId });
        const defaultMetadata: VideoMetadata = {
          id: videoId,
          title: "Untitled",
          description: "Sample video for testing",
          createdAt: Date.now(),
          creatorId: "system",
          creator: {
            username: "System"
          },
          stats: {
            views: 1,
            likes: 0,
            dislikes: 0,
            comments: 0,
            tips: 0
          }
        };
        
        await setDoc(videoRef, defaultMetadata);
        logger.info('Successfully created metadata with initial view');
        return { success: true };
      }

      logger.info('Incrementing view count', { videoId });
      await updateDoc(videoRef, {
        'stats.views': increment(1)
      });
      logger.info('Successfully incremented view count');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof FirestoreError ? error.message : 'Unknown error incrementing view count';
      logger.error('Error incrementing view count', { videoId, error });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Toggles a like on a video
   */
  async toggleLike(videoId: string, userId: string): Promise<InteractionResult<{ isLiked: boolean; like?: Like }>> {
    try {
      const db = this.getDb();
      logger.info('Toggling like', { videoId, userId });
      
      const batch = writeBatch(db);
      const likeRef = doc(db, Collections.LIKES, `${videoId}_${userId}`);
      const videoRef = doc(db, Collections.VIDEOS, videoId);
      const dislikeRef = doc(db, Collections.DISLIKES, `${videoId}_${userId}`);

      const [likeDoc, dislikeDoc] = await Promise.all([
        getDoc(likeRef),
        getDoc(dislikeRef)
      ]);

      // Remove dislike if exists
      if (dislikeDoc.exists()) {
        batch.delete(dislikeRef);
        batch.update(videoRef, {
          'stats.dislikes': increment(-1)
        });
      }

      if (likeDoc.exists()) {
        batch.delete(likeRef);
        batch.update(videoRef, {
          'stats.likes': increment(-1)
        });
        await batch.commit();
        logger.info('Successfully removed like');
        return { success: true, data: { isLiked: false } };
      } else {
        const like: Like = {
          id: `${videoId}_${userId}`,
          videoId,
          userId,
          createdAt: Date.now(),
          type: 'like'
        };
        batch.set(likeRef, like);
        batch.update(videoRef, {
          'stats.likes': increment(1)
        });
        await batch.commit();
        logger.info('Successfully added like');
        return { success: true, data: { isLiked: true, like } };
      }
    } catch (error) {
      const errorMessage = error instanceof FirestoreError ? error.message : 'Unknown error toggling like';
      logger.error('Error toggling like', { videoId, userId, error });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Toggles a dislike on a video
   */
  async toggleDislike(videoId: string, userId: string): Promise<InteractionResult<{ isDisliked: boolean; dislike?: Dislike }>> {
    try {
      const db = this.getDb();
      logger.info('Toggling dislike', { videoId, userId });
      
      const batch = writeBatch(db);
      const dislikeRef = doc(db, Collections.DISLIKES, `${videoId}_${userId}`);
      const videoRef = doc(db, Collections.VIDEOS, videoId);
      const likeRef = doc(db, Collections.LIKES, `${videoId}_${userId}`);

      const [dislikeDoc, likeDoc] = await Promise.all([
        getDoc(dislikeRef),
        getDoc(likeRef)
      ]);

      // Remove like if exists
      if (likeDoc.exists()) {
        batch.delete(likeRef);
        batch.update(videoRef, {
          'stats.likes': increment(-1)
        });
      }

      if (dislikeDoc.exists()) {
        batch.delete(dislikeRef);
        batch.update(videoRef, {
          'stats.dislikes': increment(-1)
        });
        await batch.commit();
        logger.info('Successfully removed dislike');
        return { success: true, data: { isDisliked: false } };
      } else {
        const dislike: Dislike = {
          id: `${videoId}_${userId}`,
          videoId,
          userId,
          createdAt: Date.now(),
          type: 'dislike'
        };
        batch.set(dislikeRef, dislike);
        batch.update(videoRef, {
          'stats.dislikes': increment(1)
        });
        await batch.commit();
        logger.info('Successfully added dislike');
        return { success: true, data: { isDisliked: true, dislike } };
      }
    } catch (error) {
      const errorMessage = error instanceof FirestoreError ? error.message : 'Unknown error toggling dislike';
      logger.error('Error toggling dislike', { videoId, userId, error });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Fetches comments for a video
   */
  async fetchComments(videoId: string, commentLimit = 50, startAfter?: number): Promise<InteractionResult<Comment[]>> {
    try {
      const db = this.getDb();
      logger.info('Fetching comments', { videoId, limit: commentLimit, startAfter });
      const commentsRef = collection(db, Collections.COMMENTS);
      
      let commentsQuery = query(
        commentsRef,
        where('videoId', '==', videoId),
        orderBy('createdAt', 'desc'),
        limit(commentLimit)
      );

      if (startAfter) {
        commentsQuery = query(
          commentsQuery,
          where('createdAt', '<', startAfter)
        );
      }

      const snapshot = await getDocs(commentsQuery);
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      
      logger.info('Successfully fetched comments', { 
        videoId, 
        commentCount: comments.length,
        oldestComment: comments[comments.length - 1]?.createdAt,
        newestComment: comments[0]?.createdAt
      });
      
      return { success: true, data: comments };
    } catch (error) {
      const errorMessage = error instanceof FirestoreError ? error.message : 'Unknown error fetching comments';
      logger.error('Error fetching comments', { videoId, error });
      return { success: false, error: errorMessage };
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
  ): Promise<InteractionResult<Comment>> {
    try {
      const db = this.getDb();
      logger.info('Adding comment', { videoId, userId });
      
      const batch = writeBatch(db);
      const commentsRef = collection(db, Collections.COMMENTS);
      const commentDoc = doc(commentsRef);
      const videoRef = doc(db, Collections.VIDEOS, videoId);

      const comment: Comment = {
        id: commentDoc.id,
        videoId,
        userId,
        text,
        username: userInfo.username,
        avatarUrl: userInfo.avatarUrl,
        createdAt: Date.now()
      };

      batch.set(commentDoc, comment);
      batch.update(videoRef, {
        'stats.comments': increment(1)
      });
      
      await batch.commit();
      logger.info('Successfully added comment', { commentId: comment.id });
      return { success: true, data: comment };
    } catch (error) {
      const errorMessage = error instanceof FirestoreError ? error.message : 'Unknown error adding comment';
      logger.error('Error adding comment', { videoId, userId, error });
      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export const videoInteractions = new VideoInteractionService(); 