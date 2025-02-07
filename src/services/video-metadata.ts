import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Collections, VideoMetadata, Comment, Like, Tip } from '../types/firestore';

/**
 * Fetches metadata for a list of videos
 */
export async function fetchVideosMetadata(videoIds: string[]): Promise<VideoMetadata[]> {
  try {
    // Check if user is authenticated
    const currentUser = auth().currentUser;
    console.log('🔑 Fetching metadata with auth state:', {
      isAuthenticated: !!currentUser,
      uid: currentUser?.uid,
      email: currentUser?.email,
      token: await currentUser?.getIdToken(),
      providerId: currentUser?.providerId,
    });

    if (!currentUser) {
      throw new Error('User must be authenticated to fetch video metadata');
    }

    const videosRef = firestore().collection(Collections.VIDEOS);
    console.log(`📝 Fetching metadata for videos:`, videoIds);
    
    const snapshots = await Promise.all(
      videoIds.map(id => videosRef.doc(id).get())
    );
    
    const metadata = snapshots
      .filter(snap => snap.exists)
      .map(snap => ({ id: snap.id, ...snap.data() }) as VideoMetadata);

    console.log(`✅ Successfully fetched metadata for ${metadata.length} videos`);
    return metadata;
  } catch (error) {
    console.error('❌ Error fetching videos metadata:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
    throw error;
  }
}

/**
 * Fetches comments for a video
 */
export async function fetchVideoComments(
  videoId: string,
  limit = 50,
  startAfter?: number
): Promise<Comment[]> {
  try {
    console.log(`📝 Fetching comments for video: ${videoId}`);
    
    let query = firestore()
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

    console.log(`✅ Fetched ${comments.length} comments`);
    return comments;
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    throw error;
  }
}

/**
 * Adds a comment to a video
 */
export async function addComment(
  videoId: string,
  userId: string,
  text: string,
  userInfo: { username: string; avatarUrl?: string }
): Promise<void> {
  try {
    console.log('💬 Adding comment with params:', {
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

    console.log('📝 Constructed comment object:', JSON.stringify(comment, null, 2));

    // Add to comments collection
    console.log('🔥 Attempting to add to Firestore...');
    await firestore()
      .collection(Collections.COMMENTS)
      .add(comment);

    console.log('📊 Updating comment count...');
    // Update comment count
    await firestore()
      .collection(Collections.VIDEOS)
      .doc(videoId)
      .update({
        'stats.comments': firestore.FieldValue.increment(1)
      });

    console.log('✅ Successfully added comment');
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      // Log the state at time of error
      console.error('State at time of error:', {
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
export async function sendTip(
  videoId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<void> {
  try {
    console.log(`💰 Adding tip of $${amount} to video ${videoId}`);
    await firestore()
      .collection(Collections.VIDEOS)
      .doc(videoId)
      .update({
        'stats.tips': firestore.FieldValue.increment(amount)
      });
    console.log('✅ Successfully added tip');
  } catch (error) {
    console.error('❌ Error sending tip:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
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
export async function incrementViewCount(videoId: string): Promise<void> {
  try {
    await firestore()
      .collection(Collections.VIDEOS)
      .doc(videoId)
      .update({
        'stats.views': firestore.FieldValue.increment(1)
      });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    throw error;
  }
}
/**
 * Toggles a like/superlike on a video
 */
export async function toggleLike(
  videoId: string,
  userId: string,
  type: 'like' | 'superLike' = 'like'
): Promise<boolean> {
  try {
    console.log('👍 Attempting to toggle like:', {
      videoId,
      userId,
      type,
      docId: `${videoId}_${userId}`
    });

    const likeRef = firestore()
      .collection(Collections.LIKES)
      .doc(`${videoId}_${userId}`);

    const likeDoc = await likeRef.get();
    console.log('👍 Like document exists?', likeDoc.exists);
    
    const videoRef = firestore().collection(Collections.VIDEOS).doc(videoId);

    if (likeDoc.exists) {
      // Unlike
      console.log('👍 Removing like');
      await likeRef.delete();
      await videoRef.update({
        [`stats.${type}s`]: firestore.FieldValue.increment(-1)
      });
      console.log('👍 Successfully removed like');
      return false;
    } else {
      // Like
      console.log('👍 Adding like');
      const like = {
        videoId,
        userId,
        type,
        createdAt: Date.now(),
      };
      console.log('👍 Like document:', like);
      await likeRef.set(like);
      await videoRef.update({
        [`stats.${type}s`]: firestore.FieldValue.increment(1)
      });
      console.log('👍 Successfully added like');
      return true;
    }
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    if (error instanceof Error) {
      console.error('❌ Error details:', {
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
export async function toggleDislike(
  videoId: string,
  userId: string,
  type: 'dislike' | 'superDislike' = 'dislike'
): Promise<boolean> {
  try {
    console.log('👍 Attempting to toggle dislike:', {
      videoId,
      userId,
      type,
      docId: `${videoId}_${userId}`
    });

    const dislikeRef = firestore()
      .collection(Collections.DISLIKES)
      .doc(`${videoId}_${userId}`);

    const dislikeDoc = await dislikeRef.get();
    console.log('👍 disLike document exists?', dislikeDoc.exists);
    
    const videoRef = firestore().collection(Collections.VIDEOS).doc(videoId);

    if (dislikeDoc.exists) {
      // Undislike
      console.log('👍 Removing dislike');
      await dislikeRef.delete();
      await videoRef.update({
        [`stats.${type}s`]: firestore.FieldValue.increment(-1)
      });
      console.log('👍 Successfully removed dislike');
      return false;
    } else {
      // disLike
      console.log('👍 Adding dislike');
      const dislike = {
        videoId,
        userId,
        type,
        createdAt: Date.now(),
      };
      console.log('👍 disLike document:', dislike);
      await dislikeRef.set(dislike);
      await videoRef.update({
        [`stats.${type}s`]: firestore.FieldValue.increment(1)
      });
      console.log('👍 Successfully added dislike');
      return true;
    }
  } catch (error) {
    console.error('❌ Error toggling dislike:', error);
    if (error instanceof Error) {
      console.error('❌ Error details:', {
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
 * Toggles a dislike on a video
 */
// export async function toggleDislike(
//   videoId: string,
//   userId: string,
// ): Promise<boolean> {
//   try {
//     const docId = `${videoId}_${userId}`;
//     console.log('👎 Attempting to toggle dislike:', {
//       videoId,
//       userId,
//       docId
//     });

//     const dislikeRef = firestore()
//       .collection(Collections.DISLIKES)
//       .doc(docId);

//     const dislikeDoc = await dislikeRef.get();
//     console.log('👎 Dislike document exists?', dislikeDoc.exists);
    
//     const videoRef = firestore().collection(Collections.VIDEOS).doc(videoId);

//     if (dislikeDoc.exists) {
//       // Unlike
//       console.log('👎 Removing dislike');
//       await dislikeRef.delete();
//       await videoRef.update({
//         'stats.dislikes': firestore.FieldValue.increment(-1)
//       });
//       console.log('👎 Successfully removed dislike');
//       return false;
//     } else {
//       // Like
//       console.log('👎 Adding dislike');
//       const dislike = {
//         videoId: docId.split('_')[0], // Use the same videoId as the docId prefix
//         userId,
//         type: 'dislike',
//         createdAt: Date.now(),
//       };
//       console.log('👎 Dislike document:', dislike);
//       await dislikeRef.set(dislike);
//       await videoRef.update({
//         'stats.dislikes': firestore.FieldValue.increment(1)
//       });
//       console.log('👎 Successfully added dislike');
//       return true;
//     }
//   } catch (error) {
//     console.error('❌ Error toggling dislike:', error);
//     if (error instanceof Error) {
//       console.error('❌ Error details:', {
//         message: error.message,
//         name: error.name,
//         stack: error.stack,
//         docId: `${videoId}_${userId}`,
//         collection: Collections.DISLIKES
//       });
//     }
//     throw error;
//   }
// }

/**
 * Sends a negative tip (penalty) to a video creator
 */
export async function sendNegativeTip(
  videoId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<void> {
  try {
    console.log(`💰 Adding negative tip of -$${amount} to video ${videoId}`);
    await firestore()
      .collection(Collections.VIDEOS)
      .doc(videoId)
      .update({
        'stats.tips': firestore.FieldValue.increment(-amount)
      });
    console.log('✅ Successfully added negative tip');
  } catch (error) {
    console.error('❌ Error sending negative tip:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw error;
  }
} 