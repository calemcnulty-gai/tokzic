import { createAsyncThunk } from '@reduxjs/toolkit';
import { createLogger } from '../../../../utils/logger';
import type { User } from '../../../../types/auth';
import { setUser } from '../firebaseSlice';
import { serviceManager } from '../services/ServiceManager';

const logger = createLogger('AuthThunks');

export const initializeAuth = createAsyncThunk(
  'firebase/auth/initialize',
  async (_, { dispatch }) => {
    try {
      logger.info('Initializing auth state');
      const authService = serviceManager.getAuthService();
      await authService.initializeAuthState((user) => {
        logger.info('Auth state changed', { userId: user?.uid });
        dispatch(setUser(user));
      });
      logger.info('Auth state initialized');
    } catch (error) {
      logger.error('Failed to initialize auth state', { error });
      throw error;
    }
  }
);

export const signIn = createAsyncThunk(
  'firebase/auth/signIn',
  async ({ email, password }: { email: string; password: string }, { dispatch }) => {
    try {
      logger.info('Attempting sign in', { email });
      const authService = serviceManager.getAuthService();
      const user = await authService.signIn(email, password);
      logger.info('Sign in successful', { userId: user.uid });
      dispatch(setUser(user));
      return user;
    } catch (error) {
      logger.error('Sign in failed', { email, error });
      throw new Error(error instanceof Error ? error.message : 'Sign in failed');
    }
  }
);

export const signUp = createAsyncThunk(
  'firebase/auth/signUp',
  async ({ email, password }: { email: string; password: string }, { dispatch }) => {
    try {
      logger.info('Attempting sign up', { email });
      const authService = serviceManager.getAuthService();
      const user = await authService.signUp(email, password);
      logger.info('Sign up successful', { userId: user.uid });
      dispatch(setUser(user));
      return user;
    } catch (error) {
      logger.error('Sign up failed', { email, error });
      throw new Error(error instanceof Error ? error.message : 'Sign up failed');
    }
  }
);

export const signOut = createAsyncThunk(
  'firebase/auth/signOut',
  async (_, { dispatch }) => {
    try {
      logger.info('Attempting sign out');
      const authService = serviceManager.getAuthService();
      await authService.signOut();
      logger.info('Sign out successful');
      dispatch(setUser(null));
    } catch (error) {
      logger.error('Sign out failed', { error });
      throw new Error(error instanceof Error ? error.message : 'Sign out failed');
    }
  }
);

export const signInWithGoogle = createAsyncThunk(
  'firebase/auth/signInWithGoogle',
  async (_, { dispatch }) => {
    try {
      logger.info('Attempting Google sign in');
      const authService = serviceManager.getAuthService();
      const user = await authService.signInWithGoogle();
      logger.info('Google sign in successful', { userId: user.uid });
      dispatch(setUser(user));
      return user;
    } catch (error) {
      logger.error('Google sign in failed', { error });
      throw new Error(error instanceof Error ? error.message : 'Google sign in failed');
    }
  }
); 