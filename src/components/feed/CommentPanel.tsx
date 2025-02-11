import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Comment } from '../../types/firestore';
import { createLogger } from '../../utils/logger';
import { useTheme } from '../../theme/ThemeProvider';
import { formatTimeAgo } from '../../utils/format';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  toggleComments,
  selectCommentsVisibility,
  selectIsLoadingComments,
  selectIsSubmittingComment
} from '../../store/slices/uiSlice';
import {
  handleCommentSubmission,
  selectVideoComments
} from '../../store/slices/videoSlice';

const logger = createLogger('CommentPanel');

const CommentItem = memo(({ comment }: { comment: Comment }) => {
  const theme = useTheme();
  
  return (
    <View style={[styles.commentItem, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.commentUsername, { color: theme.colors.text.primary }]}>
        {comment.username}
      </Text>
      <Text style={[styles.commentText, { color: theme.colors.text.secondary }]}>
        {comment.text}
      </Text>
      <Text style={[styles.commentTime, { color: theme.colors.text.muted }]}>
        {formatTimeAgo(comment.timestamp)}
      </Text>
    </View>
  );
});

interface CommentPanelProps {
  videoId: string;
}

export const CommentPanel = memo(function CommentPanel({ videoId }: CommentPanelProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [commentText, setCommentText] = useState('');

  // Get all state from Redux
  const isCommentsVisible = useAppSelector(selectCommentsVisibility);
  const isLoadingComments = useAppSelector(selectIsLoadingComments);
  const isSubmittingComment = useAppSelector(selectIsSubmittingComment);
  const comments = useAppSelector(state => selectVideoComments(state, videoId));

  const handleSubmit = useCallback(async () => {
    if (!commentText.trim()) {
      logger.warn('Attempted to submit empty comment');
      return;
    }

    try {
      await dispatch(handleCommentSubmission({ text: commentText.trim() })).unwrap();
      setCommentText('');
    } catch (error) {
      logger.error('Error submitting comment', { error });
    }
  }, [commentText, dispatch]);

  const handleChangeText = useCallback((text: string) => {
    setCommentText(text);
  }, []);

  const renderComment = useCallback(({ item }: { item: Comment }) => (
    <CommentItem comment={item} />
  ), []);

  const keyExtractor = useCallback((item: Comment) => item.id, []);

  if (!isCommentsVisible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Comments</Text>
        <TouchableOpacity 
          onPress={() => dispatch(toggleComments())} 
          style={styles.closeButton}
        >
          <Text style={[styles.closeButtonText, { color: theme.colors.text.primary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {isLoadingComments ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={keyExtractor}
          renderItem={renderComment}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                No comments yet. Be the first to comment!
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputContainer, { borderTopColor: theme.colors.border }]}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme.colors.background.primary,
              color: theme.colors.text.primary 
            }
          ]}
          value={commentText}
          onChangeText={handleChangeText}
          placeholder="Add a comment..."
          placeholderTextColor={theme.colors.text.muted}
          multiline
          maxLength={1000}
          editable={!isSubmittingComment}
        />
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: isSubmittingComment || !commentText.trim() ? 0.5 : 1
            }
          ]}
          onPress={handleSubmit}
          disabled={isSubmittingComment || !commentText.trim()}
        >
          {isSubmittingComment ? (
            <ActivityIndicator size="small" color={theme.colors.text.primary} />
          ) : (
            <Text style={[styles.submitButtonText, { color: theme.colors.text.primary }]}>
              Send
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  commentItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  submitButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontWeight: '600',
  },
}); 