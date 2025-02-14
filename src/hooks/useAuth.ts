import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  selectAuthState, 
  selectUser,
  selectIsAuthInitialized,
  selectIsAuthenticated,
  selectAuthLoadingStates,
  selectAuthErrors,
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
  isAuthenticated: boolean;
  loadingStates: {
    isInitializing: boolean;
    isSigningIn: boolean;
    isSigningUp: boolean;
    isSigningOut: boolean;
  };
  errors: {
    signIn?: string;
    signUp?: string;
    signOut?: string;
  };
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
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loadingStates = useSelector(selectAuthLoadingStates);
  const errors = useSelector(selectAuthErrors);

  const load = useCallback(() => {
    if (!isInitialized && !loadingStates.isInitializing) {
      logger.info('Initializing auth');
      return dispatch(initializeAuth());
    }
    return Promise.resolve();
  }, [dispatch, isInitialized, loadingStates.isInitializing]);

  // Use the standard loading state pattern
  const loadingState = useLoadingState(authState, load);

  // Auth methods
  const handleSignIn = useCallback(async (credentials: { email: string; password: string }) => {
    if (loadingStates.isSigningIn) {
      logger.warn('Sign in already in progress');
      return;
    }
    
    logger.info('Signing in', { email: credentials.email });
    await dispatch(signIn(credentials));
  }, [dispatch, loadingStates.isSigningIn]);

  const handleSignUp = useCallback(async (credentials: { email: string; password: string }) => {
    if (loadingStates.isSigningUp) {
      logger.warn('Sign up already in progress');
      return;
    }

    logger.info('Signing up', { email: credentials.email });
    await dispatch(signUp(credentials));
  }, [dispatch, loadingStates.isSigningUp]);

  const handleSignOut = useCallback(async () => {
    if (loadingStates.isSigningOut) {
      logger.warn('Sign out already in progress');
      return;
    }

    logger.info('Signing out');
    await dispatch(signOut());
  }, [dispatch, loadingStates.isSigningOut]);

  const handleGoogleSignIn = useCallback(async () => {
    if (loadingStates.isSigningIn) {
      logger.warn('Google sign in already in progress');
      return;
    }

    logger.info('Signing in with Google');
    await dispatch(signInWithGoogle());
  }, [dispatch, loadingStates.isSigningIn]);

  return {
    ...loadingState,
    user,
    isInitialized,
    isAuthenticated,
    loadingStates,
    errors,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signInWithGoogle: handleGoogleSignIn,
  };
} 