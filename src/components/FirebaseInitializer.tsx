import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { initializeFirebase } from '../store/slices/firebase/firebaseSlice';
import { selectIsInitialized, selectIsInitializing, selectInitError, selectServicesInitialized } from '../store/slices/firebase/selectors';
import { createLogger } from '../utils/logger';
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
  const servicesInitialized = useSelector(selectServicesInitialized);

  // Start Firebase initialization if needed
  useEffect(() => {
    if (!isLoaded && !isLoading && !error) {
      logger.info('Starting Firebase initialization');
      dispatch(initializeFirebase());
    }
  }, [dispatch, isLoaded, isLoading, error]);

  // Show error state if initialization failed
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
      </View>
    );
  }

  // Show loading state while initializing
  if (!isLoaded || !servicesInitialized) {
    const message = !isLoaded ? 'Initializing Firebase...' : 'Initializing Services...';
    logger.info('Initialization in progress', { stage: message });
    
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
          {message}
        </Text>
      </View>
    );
  }

  // Everything is initialized, render children
  return <>{children}</>;
} 