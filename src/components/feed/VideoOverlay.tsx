import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { VideoMetadata } from '../../types/firestore';
import { createLogger } from '../../utils/logger';
import { formatNumber } from '../../utils/format';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  toggleComments,
  toggleTipSelector,
  selectOverlayVisibility,
  selectIsProcessingLike,
  selectIsProcessingTip
} from '../../store/slices/uiSlice';
import {
  handleVideoLike,
  handleVideoDislike,
  selectVideoLikeStatus
} from '../../store/slices/videoSlice';

const logger = createLogger('VideoOverlay');
const { height: windowHeight } = Dimensions.get('window');
const NAV_BAR_HEIGHT = windowHeight * 0.15;

interface VideoOverlayProps {
  metadata: VideoMetadata;
}

export const VideoOverlay = React.memo(function VideoOverlay({ metadata }: VideoOverlayProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  // Get all state from Redux
  const isOverlayVisible = useAppSelector(selectOverlayVisibility);
  const { isLiked, isDisliked } = useAppSelector(state => selectVideoLikeStatus(state, metadata.id));
  const isProcessingLike = useAppSelector(selectIsProcessingLike);
  const isProcessingTip = useAppSelector(selectIsProcessingTip);

  if (!isOverlayVisible) return null;

  return (
    <>
      {/* Action buttons column - top right */}
      <View 
        style={[
          styles.actionsContainer,
          { backgroundColor: theme.colors.background.glass }
        ]}
      >
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => dispatch(handleVideoLike({ videoId: metadata.id }))}
            onLongPress={() => dispatch(handleVideoDislike({ videoId: metadata.id }))}
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
        </View>
      </View>

      {/* Stats row - bottom */}
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
            {formatNumber(metadata.stats?.likes ?? 0)}
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
    </>
  );
});

const styles = StyleSheet.create({
  actionsContainer: {
    position: 'absolute',
    right: 16,
    top: '5%',
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
    bottom: NAV_BAR_HEIGHT + (windowHeight * 0.025),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
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