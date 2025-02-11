import { db as firestore } from '../config/firebase';
import { Collections, VideoMetadata, Comment, Like, Tip } from '../types/firestore';
import { createLogger } from '../utils/logger';

const logger = createLogger('VideoMetadata');

export class VideoMetadataService {
  /**
   * Fetches metadata for a list of videos
   */
  async fetchVideosMetadata(videoIds: string[]): Promise<VideoMetadata[]> {
    try {
      logger.info('Fetching metadata for videos', { count: videoIds.length });
      
      const videosRef = firestore.collection(Collections.VIDEOS);
      const snapshots = await Promise.all(
        videoIds.map(id => videosRef.doc(id).get())
      );
      
      const metadata = snapshots
        .filter(snap => snap.exists)
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
      logger.info('Fetching metadata for video', { videoId });
      
      const videoRef = firestore.collection(Collections.VIDEOS).doc(videoId);
      const snapshot = await videoRef.get();

      if (!snapshot.exists) {
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
      logger.info('Updating video metadata', { videoId, updates });
      
      const videoRef = firestore.collection(Collections.VIDEOS).doc(videoId);
      await videoRef.update({
        ...updates,
        updatedAt: firestore.Timestamp.now()
      });

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
      
      const videoRef = firestore.collection(Collections.VIDEOS).doc(videoId);
      const metadata: Omit<VideoMetadata, 'id'> = {
        title: "Untitled",
        description: "Sample video for testing",
        createdAt: firestore.Timestamp.now(),
        creatorId: "system",
        creator: {
          username: "System",
          avatarUrl: null
        },
        stats: {
          views: 0,
          likes: 0,
          dislikes: 0,
          comments: 0,
          tips: 0
        }
      };

      await videoRef.set(metadata);
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
    limit = 50,
    startAfter?: number
  ): Promise<Comment[]> {
    try {
      logger.info(`Fetching comments for video: ${videoId}`);
      
      let query = firestore.collection(Collections.COMMENTS)
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

      logger.info(`Fetched ${comments.length} comments`);
      return comments;
    } catch (error) {
      logger.error('Error fetching comments:', error);
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

      logger.info('Constructed comment object:', JSON.stringify(comment, null, 2));

      // Add to comments collection
      logger.info('Attempting to add to Firestore...');
      await firestore.collection(Collections.COMMENTS)
        .add(comment);

      logger.info('Updating comment count...');
      // Update comment count
      await firestore.collection(Collections.VIDEOS)
        .doc(videoId)
        .update({
          'stats.comments': firestore.FieldValue.increment(1)
        });

      logger.info('Successfully added comment');
    } catch (error) {
      logger.error('Error adding comment:', error);
      if (error instanceof Error) {
        logger.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        // Log the state at time of error
        logger.error('State at time of error:', {
          videoId,
          userId,
          text,
          userInfo: JSON.stringify(userInfo)
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
      await firestore.collection(Collections.VIDEOS)
        .doc(videoId)
        .update({
          'stats.tips': firestore.FieldValue.increment(amount)
        });
      logger.info('Successfully added tip');
    } catch (error) {
      logger.error('Error sending tip:', error);
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
   * Increments view count for a video
   */
  async incrementViewCount(videoId: string): Promise<void> {
    try {
      const videoRef = firestore.collection(Collections.VIDEOS)
        .doc(videoId);

      // First try to get the document
      const doc = await videoRef.get();

      if (!doc.exists) {
        // If document doesn't exist, create it with default metadata
        logger.info('Creating default metadata for video:', videoId);
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
            views: 1, // Start at 1 since this is the first view
            likes: 0,
            superLikes: 0,
            dislikes: 0,
            superDislikes: 0,
            comments: 0,
            tips: 0
          }
        });
        logger.info('Successfully created metadata with initial view');
        return;
      }

      // If document exists, increment the view count
      logger.info('Incrementing view count for video:', videoId);
      await videoRef.update({
        'stats.views': firestore.FieldValue.increment(1)
      });
      logger.info('Successfully incremented view count');
    } catch (error) {
      logger.error('Error incrementing view count:', error);
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
   * Toggles a like/superlike on a video
   */
  async toggleLike(
    videoId: string,
    userId: string,
    type: 'like' | 'superLike' = 'like'
  ): Promise<boolean> {
    try {
      logger.info('Attempting to toggle like:', {
        videoId,
        userId,
        type,
        docId: `${videoId}_${userId}`
      });

      const likeRef = firestore.collection(Collections.LIKES)
        .doc(`${videoId}_${userId}`);

      const likeDoc = await likeRef.get();
      logger.info('Like document exists?', likeDoc.exists);
      
      const videoRef = firestore.collection(Collections.VIDEOS).doc(videoId);

      if (likeDoc.exists) {
        // Unlike
        logger.info('Removing like');
        await likeRef.delete();
        await videoRef.update({
          [`stats.${type}s`]: firestore.FieldValue.increment(-1)
        });
        logger.info('Successfully removed like');
        return false;
      } else {
        // Like
        logger.info('Adding like');
        const like = {
          videoId,
          userId,
          type,
          createdAt: Date.now(),
        };
        logger.info('Like document:', like);
        await likeRef.set(like);
        await videoRef.update({
          [`stats.${type}s`]: firestore.FieldValue.increment(1)
        });
        logger.info('Successfully added like');
        return true;
      }
    } catch (error) {
      logger.error('Error toggling like:', error);
      if (error instanceof Error) {
        logger.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          docId: `${videoId}_${userId}`,
          collection: Collections.LIKES
        });
      }
      throw error;
    }
  }

  /**
   * Toggles a like/superlike on a video
   */
  async toggleDislike(
    videoId: string,
    userId: string,
    type: 'dislike' | 'superDislike' = 'dislike'
  ): Promise<boolean> {
    try {
      logger.info('Attempting to toggle dislike:', {
        videoId,
        userId,
        type,
        docId: `${videoId}_${userId}`
      });

      const dislikeRef = firestore.collection(Collections.DISLIKES)
        .doc(`${videoId}_${userId}`);

      const dislikeDoc = await dislikeRef.get();
      logger.info('disLike document exists?', dislikeDoc.exists);
      
      const videoRef = firestore.collection(Collections.VIDEOS).doc(videoId);

      if (dislikeDoc.exists) {
        // Undislike
        logger.info('Removing dislike');
        await dislikeRef.delete();
        await videoRef.update({
          [`stats.${type}s`]: firestore.FieldValue.increment(-1)
        });
        logger.info('Successfully removed dislike');
        return false;
      } else {
        // disLike
        logger.info('Adding dislike');
        const dislike = {
          videoId,
          userId,
          type,
          createdAt: Date.now(),
        };
        logger.info('disLike document:', dislike);
        await dislikeRef.set(dislike);
        await videoRef.update({
          [`stats.${type}s`]: firestore.FieldValue.increment(1)
        });
        logger.info('Successfully added dislike');
        return true;
      }
    } catch (error) {
      logger.error('Error toggling dislike:', error);
      if (error instanceof Error) {
        logger.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          docId: `${videoId}_${userId}`,
          collection: Collections.DISLIKES
        });
      }
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
      logger.info(`Adding negative tip of -$${amount} to video ${videoId}`);
      await firestore.collection(Collections.VIDEOS)
        .doc(videoId)
        .update({
          'stats.tips': firestore.FieldValue.increment(-amount)
        });
      logger.info('Successfully added negative tip');
    } catch (error) {
      logger.error('Error sending negative tip:', error);
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
}

// Export singleton instance
export const videoMetadata = new VideoMetadataService(); 