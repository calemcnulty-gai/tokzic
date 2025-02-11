import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchInitialFeed, fetchMoreVideos, refreshFeed } from '../store/slices/feedSlice';
import type { RootState, AppDispatch } from '../store';

export function usePagination() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    videos,
    isLoading,
    isRefreshing,
    hasMoreVideos,
    error
  } = useSelector((state: RootState) => state.feed);

  const loadInitialFeed = useCallback(async () => {
    try {
      await dispatch(fetchInitialFeed()).unwrap();
    } catch (error) {
      console.error('Failed to load initial feed:', error);
    }
  }, [dispatch]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMoreVideos) return;
    
    try {
      await dispatch(fetchMoreVideos()).unwrap();
    } catch (error) {
      console.error('Failed to load more videos:', error);
    }
  }, [dispatch, isLoading, hasMoreVideos]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      await dispatch(refreshFeed()).unwrap();
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    }
  }, [dispatch, isRefreshing]);

  return {
    videos,
    isLoading,
    isRefreshing,
    hasMoreVideos,
    error,
    loadInitialFeed,
    loadMore,
    handleRefresh,
  };
} 