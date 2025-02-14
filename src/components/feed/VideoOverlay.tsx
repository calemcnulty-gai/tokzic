import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import type { VideoMetadata } from '../../types/firestore';
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
  metadata: VideoMetadata;
}

export const VideoOverlay = React.memo(function VideoOverlay({ metadata }: VideoOverlayProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  // Get all state from Redux using properly typed selectors
  const isOverlayVisible = useAppSelector(selectOverlayVisibility);
  const interactionState = useAppSelector((state: RootState) => selectVideoInteractionState(state, metadata.id));
  const isProcessingLike = useAppSelector(selectIsProcessingLike);
  const isProcessingTip = useAppSelector(selectIsProcessingTip);

  const { isLiked, isDisliked, likeCount, dislikeCount } = interactionState;

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
      await dispatch(handleVideoLike({ videoId: metadata.id }));
    } catch (error) {
      logger.error('Failed to handle like', { error });
    }
  }, [dispatch, metadata.id]);

  const handleDislike = useCallback(async () => {
    try {
      await dispatch(handleVideoDislike({ videoId: metadata.id }));
    } catch (error) {
      logger.error('Failed to handle dislike', { error });
    }
  }, [dispatch, metadata.id]);

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
            color={isLiked ? theme.colors.neon.pink : theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {formatNumber(likeCount)}
          </Text>
        </View>

        <View style={styles.statsGroup}>
          <Icon 
            name="cash" 
            size={16} 
            color={theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            ${metadata.stats?.tips ?? 0}
          </Text>
        </View>

        <View style={styles.statsGroup}>
          <Icon 
            name="eye" 
            size={16} 
            color={theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {formatNumber(metadata.stats?.views ?? 0)}
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
              name={isLiked ? 'heart' : 'heart-outline'} 
              size={28} 
              color={isLiked ? theme.colors.neon.pink : theme.colors.text.primary} 
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