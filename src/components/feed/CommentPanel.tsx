import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Portal } from '@gorhom/portal';
import { useTheme } from '../../theme/ThemeProvider';
import { Comment } from '../../types/firestore';
import { format } from 'date-fns';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.7; // 70% of screen height

interface CommentPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmitComment: (text: string) => Promise<void>;
  comments: Comment[];
  isLoading?: boolean;
}

interface CommentCardProps {
  comment: Comment;
}

function CommentCard({ comment }: CommentCardProps) {
  const theme = useTheme();
  
  return (
    <View style={[styles.commentCard, { backgroundColor: theme.colors.background.secondary }]}>
      <View style={styles.commentHeader}>
        <Text style={[styles.username, { color: theme.colors.text.primary }]}>
          {comment.user.username}
        </Text>
        <Text style={[styles.timestamp, { color: theme.colors.text.secondary }]}>
          {format(comment.createdAt, 'MMM d, h:mm a')}
        </Text>
      </View>
      <Text style={[styles.commentText, { color: theme.colors.text.primary }]}>
        {comment.text}
      </Text>
    </View>
  );
}

export function CommentPanel({
  isVisible,
  onClose,
  onSubmitComment,
  comments,
  isLoading = false,
}: CommentPanelProps) {
  const theme = useTheme();
  const [comment, setComment] = useState('');
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: PANEL_HEIGHT,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    
    try {
      await onSubmitComment(comment.trim());
      setComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <Portal>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
                backgroundColor: theme.colors.background.overlay,
              },
            ]}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.panel,
                  {
                    backgroundColor: theme.colors.background.primary,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                    Comments
                  </Text>
                </View>

                <View style={styles.commentsContainer}>
                  <FlatList
                    data={[...comments].sort((a, b) => b.createdAt - a.createdAt)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <CommentCard comment={item} />}
                    contentContainerStyle={styles.commentsList}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                          No comments yet
                        </Text>
                      </View>
                    }
                  />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: theme.colors.background.secondary }]}>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text.primary }]}
                    placeholder="Write a comment..."
                    placeholderTextColor={theme.colors.text.secondary}
                    value={comment}
                    onChangeText={setComment}
                    onSubmitEditing={handleSubmit}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { backgroundColor: theme.colors.neon.green },
                    ]}
                    onPress={handleSubmit}
                  >
                    <Text style={[styles.sendText, { color: theme.colors.text.inverse }]}>
                      Send
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    height: PANEL_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentsContainer: {
    flex: 1,
  },
  commentsList: {
    padding: 16,
  },
  commentCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
  },
}); 