import { Collections, VideoMetadata, Comment, Like, Tip } from '../types/firestore';
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
  increment
} from 'firebase/firestore';

const logger = createLogger('VideoInteractions');

export class VideoInteractionService {
  private getDb() {
    return serviceManager.getFirestoreService().getFirestore();
  }

  /**
   * Increments view count for a video
   */
  async incrementViewCount(videoId: string): Promise<void> {
    try {
      const db = this.getDb();
      const videoRef = doc(db, Collections.VIDEOS, videoId);

      // First try to get the document
      const docSnap = await getDoc(videoRef);

      if (!docSnap.exists()) {
        logger.info('Creating default metadata for video', { videoId });
        await setDoc(videoRef, {
          id: videoId,
          title: "Untitled",
          description: "Sample video for testing",
          createdAt: Date.now(),
          creatorId: "system",
          creator: {
            username: "System",
            avatarUrl: null
          },
          stats: {
            views: 1,
            likes: 0,
            dislikes: 0,
            comments: 0,
            tips: 0
          }
        });
        logger.info('Successfully created metadata with initial view');
        return;
      }

      logger.info('Incrementing view count', { videoId });
      await updateDoc(videoRef, {
        'stats.views': increment(1)
      });
      logger.info('Successfully incremented view count');
    } catch (error) {
      logger.error('Error incrementing view count', { videoId, error });
      throw error;
    }
  }

  /**
   * Toggles a like on a video
   */
  async toggleLike(videoId: string, userId: string): Promise<boolean> {
    try {
      const db = this.getDb();
      logger.info('Toggling like', { videoId, userId });
      const likeRef = doc(db, Collections.LIKES, `${videoId}_${userId}`);

      const likeDoc = await getDoc(likeRef);
      const videoRef = doc(db, Collections.VIDEOS, videoId);

      if (likeDoc.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(videoRef, {
          'stats.likes': increment(-1)
        });
        logger.info('Successfully removed like');
        return false;
      } else {
        const like = {
          videoId,
          userId,
          createdAt: Date.now(),
        };
        await setDoc(likeRef, like);
        await updateDoc(videoRef, {
          'stats.likes': increment(1)
        });
        logger.info('Successfully added like');
        return true;
      }
    } catch (error) {
      logger.error('Error toggling like', { videoId, userId, error });
      throw error;
    }
  }

  /**
   * Toggles a dislike on a video
   */
  async toggleDislike(videoId: string, userId: string): Promise<boolean> {
    try {
      const db = this.getDb();
      logger.info('Toggling dislike', { videoId, userId });
      const dislikeRef = doc(db, Collections.DISLIKES, `${videoId}_${userId}`);

      const dislikeDoc = await getDoc(dislikeRef);
      const videoRef = doc(db, Collections.VIDEOS, videoId);

      if (dislikeDoc.exists()) {
        await deleteDoc(dislikeRef);
        await updateDoc(videoRef, {
          'stats.dislikes': increment(-1)
        });
        logger.info('Successfully removed dislike');
        return false;
      } else {
        const dislike = {
          videoId,
          userId,
          createdAt: Date.now(),
        };
        await setDoc(dislikeRef, dislike);
        await updateDoc(videoRef, {
          'stats.dislikes': increment(1)
        });
        logger.info('Successfully added dislike');
        return true;
      }
    } catch (error) {
      logger.error('Error toggling dislike', { videoId, userId, error });
      throw error;
    }
  }

  /**
   * Fetches comments for a video
   */
  async fetchComments(videoId: string, commentLimit = 50, startAfter?: number): Promise<Comment[]> {
    try {
      const db = this.getDb();
      logger.info('Fetching comments', { videoId, limit: commentLimit, startAfter });
      const commentsRef = collection(db, Collections.COMMENTS);
      
      let commentsQuery = query(
        commentsRef,
        where('videoId', '==', videoId),
        orderBy('timestamp', 'desc'),
        limit(commentLimit)
      );

      if (startAfter) {
        commentsQuery = query(
          commentsQuery,
          where('timestamp', '<', startAfter)
        );
      }

      const snapshot = await getDocs(commentsQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    } catch (error) {
      logger.error('Error fetching comments', { videoId, error });
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
      const db = this.getDb();
      logger.info('Adding comment', { videoId, userId });
      const commentsRef = collection(db, Collections.COMMENTS);
      const videoRef = doc(db, Collections.VIDEOS, videoId);

      const comment = {
        videoId,
        userId,
        text,
        username: userInfo.username,
        avatarUrl: userInfo.avatarUrl,
        timestamp: Date.now()
      };

      await setDoc(doc(commentsRef), comment);
      await updateDoc(videoRef, {
        'stats.comments': increment(1)
      });
      logger.info('Successfully added comment');
    } catch (error) {
      logger.error('Error adding comment', { videoId, userId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const videoInteractions = new VideoInteractionService(); 