import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  selectAuthState, 
  selectUser,
  selectIsAuthInitialized,
  initializeAuth,
  signOut,
  signIn,
  signUp,
  signInWithGoogle
} from '../store/slices/authSlice';
import { useLoadingState } from './useLoadingState';
import type { LoadingState } from '../types/state';
import type { User } from '../types/auth';
import { createLogger } from '../utils/logger';
import { useAppDispatch } from '../store/hooks';

const logger = createLogger('useAuth');

interface UseAuthResult extends LoadingState {
  user: User | null;
  isInitialized: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signUp: (credentials: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const dispatch = useAppDispatch();
  const authState = useSelector(selectAuthState);
  const user = useSelector(selectUser);
  const isInitialized = useSelector(selectIsAuthInitialized);

  const load = useCallback(() => {
    if (!isInitialized) {
      logger.info('Initializing auth');
      return dispatch(initializeAuth());
    }
    return Promise.resolve();
  }, [dispatch, isInitialized]);

  // Use the standard loading state pattern
  const loadingState = useLoadingState(authState, load);

  // Auth methods
  const handleSignIn = useCallback(async (credentials: { email: string; password: string }) => {
    logger.info('Signing in', { email: credentials.email });
    await dispatch(signIn(credentials));
  }, [dispatch]);

  const handleSignUp = useCallback(async (credentials: { email: string; password: string }) => {
    logger.info('Signing up', { email: credentials.email });
    await dispatch(signUp(credentials));
  }, [dispatch]);

  const handleSignOut = useCallback(async () => {
    logger.info('Signing out');
    await dispatch(signOut());
  }, [dispatch]);

  const handleGoogleSignIn = useCallback(async () => {
    logger.info('Signing in with Google');
    await dispatch(signInWithGoogle());
  }, [dispatch]);

  return {
    ...loadingState,
    user,
    isInitialized,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signInWithGoogle: handleGoogleSignIn,
  };
} 