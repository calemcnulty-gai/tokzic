import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import type { VideoWithMetadata } from '../../types/video';
import { createLogger } from '../../utils/logger';
import { formatNumber } from '../../utils/format';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { RootState } from '../../store/types';
import {
  toggleComments,
  toggleTipSelector,
  selectOverlayVisibility,
  selectIsProcessingLike,
  selectIsProcessingTip
} from '../../store/slices/uiSlice';
import { selectVideoInteractionState } from '../../store/selectors/interactionSelectors';
import {
  handleVideoLike,
  handleVideoDislike
} from '../../store/slices/interactionSlice';
import { signOut } from '../../store/slices/authSlice';

const logger = createLogger('VideoOverlay');

interface VideoOverlayProps {
  video: VideoWithMetadata;
}

export const VideoOverlay = React.memo(function VideoOverlay({ video }: VideoOverlayProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [localIsLiked, setLocalIsLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);

  // Get all state from Redux using properly typed selectors
  const isOverlayVisible = useAppSelector(selectOverlayVisibility);
  const interactionState = useAppSelector((state: RootState) => selectVideoInteractionState(state, video.video.id));
  const isProcessingLike = useAppSelector(selectIsProcessingLike);
  const isProcessingTip = useAppSelector(selectIsProcessingTip);

  // Initialize local state from Redux state
  React.useEffect(() => {
    setLocalIsLiked(interactionState.isLiked);
    setLocalLikeCount(interactionState.likeCount);
  }, [interactionState.isLiked, interactionState.likeCount]);

  const handleLogout = async () => {
    try {
      logger.info('Initiating logout');
      await dispatch(signOut()).unwrap();
      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout failed', { error });
    }
  };

  const handleLike = useCallback(async () => {
    try {
      // Optimistically update UI
      setLocalIsLiked(prev => !prev);
      setLocalLikeCount(prev => prev + (localIsLiked ? -1 : 1));
      
      // Actually perform the action
      await dispatch(handleVideoLike({ videoId: video.video.id }));
    } catch (error) {
      // Revert optimistic update on error
      setLocalIsLiked(interactionState.isLiked);
      setLocalLikeCount(interactionState.likeCount);
      logger.error('Failed to handle like', { error });
    }
  }, [dispatch, video.video.id, localIsLiked, interactionState.isLiked, interactionState.likeCount]);

  const handleDislike = useCallback(async () => {
    try {
      await dispatch(handleVideoDislike({ videoId: video.video.id }));
    } catch (error) {
      logger.error('Failed to handle dislike', { error });
    }
  }, [dispatch, video.video.id]);

  if (!isOverlayVisible) return null;

  return (
    <>
      {/* Stats row - top */}
      <View 
        style={[
          styles.statsContainer,
          { backgroundColor: theme.colors.background.glass }
        ]}
      >
        <View style={styles.statsGroup}>
          <Icon 
            name="heart" 
            size={16} 
            color={localIsLiked ? theme.colors.neon.pink : theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {formatNumber(localLikeCount)}
          </Text>
        </View>

        <View style={styles.statsGroup}>
          <Icon 
            name="cash" 
            size={16} 
            color={theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            ${video.metadata.stats?.tips ?? 0}
          </Text>
        </View>

        <View style={styles.statsGroup}>
          <Icon 
            name="eye" 
            size={16} 
            color={theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {formatNumber(video.metadata.stats?.views ?? 0)}
          </Text>
        </View>
      </View>

      {/* Action buttons column - right side */}
      <View 
        style={[
          styles.actionsContainer,
          { backgroundColor: theme.colors.background.glass }
        ]}
      >
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLike}
            onLongPress={handleDislike}
            delayLongPress={500}
            disabled={isProcessingLike}
          >
            <Icon 
              name={localIsLiked ? 'heart' : 'heart-outline'} 
              size={28} 
              color={localIsLiked ? theme.colors.neon.pink : theme.colors.text.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => dispatch(toggleTipSelector())}
            disabled={isProcessingTip}
          >
            <Icon 
              name="cash-outline" 
              size={28} 
              color={theme.colors.text.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => dispatch(toggleComments())}
          >
            <Icon 
              name="chatbubble-outline" 
              size={28} 
              color={theme.colors.text.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLogout}
          >
            <Icon 
              name="log-out-outline" 
              size={28} 
              color={theme.colors.text.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  actionsContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -100 }],
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    width: 52,
    overflow: 'hidden',
  },
  actionButtons: {
    width: 52,
    flexDirection: 'column',
    gap: 20,
    alignItems: 'center',
  },
  actionButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  statsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 