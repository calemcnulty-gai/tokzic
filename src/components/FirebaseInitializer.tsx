import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { initializeFirebase } from '../store/slices/firebase/firebaseSlice';
import { selectIsInitialized, selectIsInitializing, selectInitError } from '../store/slices/firebase/selectors';
import { initializeAuth } from '../store/slices/authSlice';
import { createLogger } from '../utils/logger';
import type { RootState } from '../store';
import { useAppDispatch } from '../store/hooks';

const logger = createLogger('FirebaseInitializer');

interface FirebaseInitializerProps {
  children: React.ReactNode;
}

export function FirebaseInitializer({ children }: FirebaseInitializerProps) {
  const dispatch = useAppDispatch();
  const isLoading = useSelector(selectIsInitializing);
  const isLoaded = useSelector(selectIsInitialized);
  const error = useSelector(selectInitError);

  useEffect(() => {
    // Initial Firebase initialization
    if (!isLoaded && !isLoading && !error) {
      logger.info('Starting Firebase initialization');
      dispatch(initializeFirebase());
    }
  }, [dispatch, isLoaded, isLoading, error]);

  // Auth is initialized elsewhere in the app
  // useEffect(() => {
  //   // Once Firebase is loaded, initialize auth
  //   if (isLoaded && !error) {
  //     logger.info('Firebase loaded, initializing auth');
  //     dispatch(initializeAuth());
  //   }
  // }, [dispatch, isLoaded, error]);

  // Standard loading state pattern
  if (isLoaded) {
    logger.info('Firebase initialization complete');
    return <>{children}</>;
  }

  if (error) {
    logger.error('Firebase initialization failed', { error });
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#0A0A0F',
        padding: 20 
      }}>
        <Text style={{ 
          color: '#FF4444', 
          fontSize: 18, 
          marginBottom: 10,
          fontWeight: 'bold'
        }}>
          Firebase Initialization Failed
        </Text>
        <Text style={{ 
          color: '#FFFFFF', 
          textAlign: 'center',
          marginBottom: 20
        }}>
          {error}
        </Text>
        <Text style={{ 
          color: '#999999', 
          textAlign: 'center',
          fontSize: 12
        }}>
          Please check your configuration and try again
        </Text>
      </View>
    );
  }

  // Loading state
  logger.info('Firebase initialization in progress');
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#0A0A0F' 
    }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={{ 
        color: '#FFFFFF',
        marginTop: 20,
        fontSize: 16
      }}>
        Initializing Firebase...
      </Text>
    </View>
  );
} 