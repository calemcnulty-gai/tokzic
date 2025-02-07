import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Video as VideoType } from '../services/video';
import { VideoMetadata, Comment } from '../types/firestore';
import { VideoOverlay } from './feed/VideoOverlay';
import { CommentPanel } from './feed/CommentPanel';
import { toggleLike, sendTip, incrementViewCount, fetchVideoComments, addComment, toggleDislike, sendNegativeTip } from '../services/video-metadata';
import { useAuth } from '../hooks/useAuth';
import { firestore } from '../services/firebase';
import { Collections } from '../types/firestore';

interface VideoPlayerProps {
  video: VideoType;
  metadata: VideoMetadata;
  shouldPlay?: boolean;
}

const { width, height } = Dimensions.get('window');

export function VideoPlayer({ video, metadata, shouldPlay = false }: VideoPlayerProps) {
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const { user } = useAuth();
  const videoRef = useRef<Video>(null);

  // Check initial like/dislike state
  useEffect(() => {
    if (!user) return;

    const checkInteractions = async () => {
      try {
        // Check like status
        const likeDoc = await firestore()
          .collection(Collections.LIKES)
          .doc(`${video.id}_${user.uid}`)
          .get();
        setIsLiked(likeDoc.exists);

        // Check dislike status
        const dislikeDoc = await firestore()
          .collection(Collections.DISLIKES)
          .doc(`${video.id}_${user.uid}`)
          .get();
        setIsDisliked(dislikeDoc.exists);
      } catch (error) {
        console.error('Error checking like/dislike status:', error);
      }
    };

    checkInteractions();
  }, [video.id, user]);

  const loadComments = useCallback(async () => {
    if (!isCommentsVisible) return;
    
    try {
      setIsLoadingComments(true);
      const fetchedComments = await fetchVideoComments(video.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [video.id, isCommentsVisible]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    setStatus(status);
    if ('error' in status) {
      console.error(`❌ Video playback error for ${video.id}:`, status.error);
    } else {
      if (status.isLoaded) {
        // Log initial load
        if (!status.isPlaying && status.positionMillis === 0) {
          console.log(`✅ Video ${video.id} loaded successfully`);
          console.log(`📊 Duration: ${status.durationMillis}ms, Size: ${width}x${height}`);
          // Increment view count on first load
          incrementViewCount(video.id).catch(console.error);
        }
        // Log play/pause
        if (status.isPlaying) {
          console.log(`▶️ Video ${video.id} playing at position ${status.positionMillis}ms`);
        }
      } else {
        console.log(`⏳ Video ${video.id} loading...`);
      }
    }
  };

  const handleLike = useCallback(async () => {
    if (!user) return;
    try {
      // If disliked, remove dislike first
      if (isDisliked) {
        await toggleDislike(video.id, user.uid);
        setIsDisliked(false);
      }
      const liked = await toggleLike(video.id, user.uid);
      setIsLiked(liked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [video.id, user, isDisliked]);

  const handleDislike = useCallback(async () => {
    if (!user) return;
    try {
      // If liked, remove like first
      if (isLiked) {
        await toggleLike(video.id, user.uid);
        setIsLiked(false);
      }
      const disliked = await toggleDislike(video.id, user.uid);
      setIsDisliked(disliked);
    } catch (error) {
      console.error('Error toggling dislike:', error);
    }
  }, [video.id, user, isLiked]);

  const handleTip = useCallback(async (amount: number) => {
    if (!user) return;
    try {
      console.log('💰 Attempting to send tip:', {
        amount,
        videoId: video.id,
        fromUserId: user.uid,
        toUserId: metadata.creatorId
      });
      await sendTip(video.id, user.uid, metadata.creatorId, amount);
      console.log(`✅ Successfully sent $${amount} tip for video ${video.id}`);
    } catch (error) {
      console.error('❌ Error sending tip:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    }
  }, [video.id, metadata.creatorId, user]);

  const handleNegativeTip = useCallback(async (amount: number) => {
    if (!user) return;
    try {
      console.log('💰 Attempting to send negative tip:', {
        amount,
        videoId: video.id,
        fromUserId: user.uid,
        toUserId: metadata.creatorId
      });
      await sendNegativeTip(video.id, user.uid, metadata.creatorId, amount);
      console.log(`✅ Successfully sent -$${amount} tip for video ${video.id}`);
    } catch (error) {
      console.error('❌ Error sending negative tip:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    }
  }, [video.id, metadata.creatorId, user]);

  const handleComment = useCallback(() => {
    setIsCommentsVisible(true);
  }, []);

  const handleSubmitComment = useCallback(async (text: string) => {
    if (!user) return;
    
    try {
      console.log('🎯 Submitting comment:', {
        text,
        user: {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        videoId: video.id
      });

      await addComment(video.id, user.uid, text, {
        username: user.displayName || 'Anonymous',
        avatarUrl: user.photoURL || undefined,
      });
      // Reload comments to show the new one
      loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      throw error;
    }
  }, [video.id, user, loadComments]);

  const handleVideoPress = async () => {
    if (!videoRef.current) return;
    
    if (status?.isLoaded) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleVideoPress}>
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: video.url }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={shouldPlay}
            isLooping
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => {
              console.error(`❌ Video loading error for ${video.id}:`, error);
            }}
          />
        </View>
      </TouchableWithoutFeedback>
      <VideoOverlay
        metadata={metadata}
        onLike={handleLike}
        onDislike={handleDislike}
        onTip={handleTip}
        onNegativeTip={handleNegativeTip}
        onComment={handleComment}
        isLiked={isLiked}
        isDisliked={isDisliked}
      />
      <CommentPanel
        isVisible={isCommentsVisible}
        onClose={() => setIsCommentsVisible(false)}
        onSubmitComment={handleSubmitComment}
        comments={comments}
        isLoading={isLoadingComments}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
}); 