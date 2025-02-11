import React, { useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';
import { createLogger } from '../utils/logger';
import { mapFirebaseUser } from '../types/auth';

const logger = createLogger('AuthInitializer');

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    logger.info('Setting up auth state listener');
    const unsubscribe = auth().onAuthStateChanged(user => {
      logger.info('Auth state changed', { userId: user?.uid });
      const mappedUser = mapFirebaseUser(user);
      dispatch(setUser(mappedUser));
    });

    return () => {
      logger.info('Cleaning up auth state listener');
      unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
} 