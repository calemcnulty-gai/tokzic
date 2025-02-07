import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { VideoMetadata } from '../../types/firestore';
import firestore from '@react-native-firebase/firestore';
import { Collections } from '../../types/firestore';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Get window dimensions
const { height: windowHeight } = Dimensions.get('window');
const NAV_BAR_HEIGHT = windowHeight * 0.15; // 15% of screen height
const TIP_AMOUNTS = [1, 2, 5, 10];
const DEFAULT_TIP = 5;

interface VideoOverlayProps {
  metadata: VideoMetadata;
  onLike: () => void;
  onTip: (amount: number) => void;
  onComment: () => void;
  isLiked?: boolean;
  onDislike?: () => void;
  onNegativeTip?: (amount: number) => void;
  isDisliked?: boolean;
}

export function VideoOverlay({ 
  metadata, 
  onLike, 
  onTip, 
  onComment, 
  isLiked = false,
  onDislike,
  onNegativeTip,
  isDisliked = false
}: VideoOverlayProps) {
  const theme = useTheme();
  const [stats, setStats] = useState(metadata.stats);
  const [isTipVisible, setIsTipVisible] = useState(false);
  const [isNegativeTip, setIsNegativeTip] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState(DEFAULT_TIP);
  const [contentOpacity] = useState(new Animated.Value(0));
  const longPressTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Subscribe to real-time updates for the video's stats
    const unsubscribe = firestore()
      .collection(Collections.VIDEOS)
      .doc(metadata.id)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            if (data?.stats) {
              setStats(data.stats);
            }
          }
        },
        (error) => {
          console.error('Error in stats subscription:', error);
        }
      );

    return () => unsubscribe();
  }, [metadata.id]);

  useEffect(() => {
    // Configure spring animation
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.7,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.7,
      },
    });

    // Fade content
    Animated.spring(contentOpacity, {
      toValue: isTipVisible ? 1 : 0,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [isTipVisible]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const handleLikePress = () => {
    onLike();
  };

  const handleTipPress = () => {
    setIsNegativeTip(false);
    setIsTipVisible(!isTipVisible);
  };

  const handleLikeLongPress = () => {
    if (onDislike) {
      onDislike();
    }
  };

  const handleTipLongPress = () => {
    setIsNegativeTip(true);
    setIsTipVisible(!isTipVisible);
  };

  const handleSendTip = () => {
    if (isNegativeTip && onNegativeTip) {
      onNegativeTip(selectedTipAmount);
    } else {
      onTip(selectedTipAmount);
    }
    setIsTipVisible(false);
    setIsNegativeTip(false);
  };

  return (
    <>
      {/* Action buttons column - top right */}
      <View 
        style={[
          styles.actionsContainer,
          theme.glass.default,
          isTipVisible && styles.actionsContainerExpanded
        ]}
      >
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLikePress}
            onLongPress={handleLikeLongPress}
            delayLongPress={500}
          >
            <Icon 
              name={isLiked || isDisliked ? 'heart' : 'heart-outline'} 
              size={28} 
              color={isDisliked ? theme.colors.neon.green : isLiked ? theme.colors.neon.pink : theme.colors.text.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleTipPress}
            onLongPress={handleTipLongPress}
            delayLongPress={500}
          >
            <Icon 
              name="cash-outline" 
              size={28} 
              color={isTipVisible ? (isNegativeTip ? theme.colors.neon.green : theme.colors.neon.pink) : theme.colors.text.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onComment}
          >
            <Icon 
              name="chatbubble-outline" 
              size={28} 
              color={theme.colors.text.primary} 
            />
          </TouchableOpacity>
        </View>

        <Animated.View 
          style={[
            styles.tipContent,
            { 
              opacity: contentOpacity,
              display: isTipVisible ? 'flex' : 'none'
            }
          ]}
        >
          <View style={styles.tipGridContainer}>
            <View style={styles.tipGrid}>
              {TIP_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.tipButton,
                    amount === selectedTipAmount && styles.selectedTip,
                    {
                      backgroundColor:
                        amount === selectedTipAmount
                          ? (isNegativeTip ? theme.colors.neon.green : theme.colors.neon.pink)
                          : theme.colors.background.secondary,
                    },
                  ]}
                  onPress={() => setSelectedTipAmount(amount)}
                >
                  <Text
                    style={[
                      styles.tipText,
                      {
                        color: theme.colors.text.primary,
                      },
                    ]}
                  >
                    {isNegativeTip ? '-' : ''}${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.sendContainer}>
            <TouchableOpacity
              style={[
                styles.sendButton, 
                { backgroundColor: isNegativeTip ? theme.colors.neon.green : theme.colors.neon.pink }
              ]}
              onPress={handleSendTip}
            >
              <Text style={[styles.sendText, { color: theme.colors.text.primary }]}>
                {isNegativeTip ? 'Send Penalty' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Stats row - bottom */}
      <View style={[styles.statsContainer, theme.glass.default]}>
        <View style={styles.statsGroup}>
          <Icon 
            name="heart" 
            size={16} 
            color={isDisliked ? theme.colors.neon.green : isLiked ? theme.colors.neon.pink : theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {formatNumber(stats.likes + stats.superLikes - (stats.dislikes || 0))}
          </Text>
        </View>

        <View style={styles.statsGroup}>
          <Icon 
            name="cash" 
            size={16} 
            color={theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {formatCurrency(stats.tips)}
          </Text>
        </View>

        <View style={styles.statsGroup}>
          <Icon 
            name="eye" 
            size={16} 
            color={theme.colors.text.primary} 
          />
          <Text style={[styles.statsText, { color: theme.colors.text.primary }]}>
            {formatNumber(stats.views)}
          </Text>
        </View>
      </View>
    </>
  );
}

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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  actionsContainerExpanded: {
    width: 160,
    paddingRight: 12,
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
  tipContent: {
    flex: 1,
    flexDirection: 'column',
  },
  tipGridContainer: {
    flex: 2,
  },
  tipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignContent: 'space-between',
    justifyContent: 'space-between',
  },
  tipButton: {
    width: 40,
    height: 28,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTip: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sendButton: {
    height: 28,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontSize: 14,
    fontWeight: '600',
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