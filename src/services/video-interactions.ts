import { db as firestore } from '../config/firebase';
import { Collections, VideoMetadata, Comment, Like, Tip } from '../types/firestore';
import { createLogger } from '../utils/logger';

const logger = createLogger('VideoInteractions');

export class VideoInteractionService {
  /**
   * Increments view count for a video
   */
  async incrementViewCount(videoId: string): Promise<void> {
    try {
      const videoRef = firestore
        .collection(Collections.VIDEOS)
        .doc(videoId);

      // First try to get the document
      const doc = await videoRef.get();

      if (!doc.exists) {
        logger.info('Creating default metadata for video', { videoId });
        await videoRef.set({
          id: videoId,
          title: "Untitled",
          description: "Sample video for testing",
          createdAt: firestore.Timestamp.now(),
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
      await videoRef.update({
        'stats.views': firestore.FieldValue.increment(1)
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
      logger.info('Toggling like', { videoId, userId });
      const likeRef = firestore
        .collection(Collections.LIKES)
        .doc(`${videoId}_${userId}`);

      const likeDoc = await likeRef.get();
      const videoRef = firestore.collection(Collections.VIDEOS).doc(videoId);

      if (likeDoc.exists) {
        await likeRef.delete();
        await videoRef.update({
          'stats.likes': firestore.FieldValue.increment(-1)
        });
        logger.info('Successfully removed like');
        return false;
      } else {
        const like = {
          videoId,
          userId,
          createdAt: Date.now(),
        };
        await likeRef.set(like);
        await videoRef.update({
          'stats.likes': firestore.FieldValue.increment(1)
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
      logger.info('Toggling dislike', { videoId, userId });
      const dislikeRef = firestore
        .collection(Collections.DISLIKES)
        .doc(`${videoId}_${userId}`);

      const dislikeDoc = await dislikeRef.get();
      const videoRef = firestore.collection(Collections.VIDEOS).doc(videoId);

      if (dislikeDoc.exists) {
        await dislikeRef.delete();
        await videoRef.update({
          'stats.dislikes': firestore.FieldValue.increment(-1)
        });
        logger.info('Successfully removed dislike');
        return false;
      } else {
        const dislike = {
          videoId,
          userId,
          createdAt: Date.now(),
        };
        await dislikeRef.set(dislike);
        await videoRef.update({
          'stats.dislikes': firestore.FieldValue.increment(1)
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
  async fetchComments(videoId: string, limit = 50, startAfter?: number): Promise<Comment[]> {
    try {
      logger.info('Fetching comments', { videoId, limit, startAfter });
      let query = firestore
        .collection(Collections.COMMENTS)
        .where('videoId', '==', videoId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];

      logger.info('Successfully fetched comments', { count: comments.length });
      return comments;
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
      logger.info('Adding comment', { videoId, userId });
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

      await firestore
        .collection(Collections.COMMENTS)
        .add(comment);

      await firestore
        .collection(Collections.VIDEOS)
        .doc(videoId)
        .update({
          'stats.comments': firestore.FieldValue.increment(1)
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