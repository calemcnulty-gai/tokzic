import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { signOut, initializeAuth, cleanupAuth } from '../store/slices/authSlice';
import type { RootState, AppDispatch } from '../store';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading: loading, error, isInitialized } = useSelector((state: RootState) => state.auth);

  // Initialize auth state listener
  useEffect(() => {
    dispatch(initializeAuth());
    return () => {
      dispatch(cleanupAuth());
    };
  }, [dispatch]);

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
    } catch (error) {
      // Error is already handled in the slice
      console.error('Sign out error:', error);
    }
  };

  return {
    user,
    loading,
    error,
    isInitialized,
    signOut: handleSignOut,
    isAuthenticated: !!user,
  };
} 