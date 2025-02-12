import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { createLogger } from '../utils/logger';
import { initializeFirebase } from '../store/slices/firebase/firebaseSlice';
import { selectIsInitialized, selectIsInitializing, selectInitError } from '../store/slices/firebase/selectors';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';
import { useAppDispatch } from '../store/hooks';

const logger = createLogger('AuthInitializer');

interface AuthInitializerProps {
  children: React.ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const dispatch = useAppDispatch();
  const isLoading = useSelector(selectIsInitializing);
  const isLoaded = useSelector(selectIsInitialized);
  const error = useSelector(selectInitError);

  // Check if all services are initialized
  const isFullyInitialized = isLoaded && serviceManager.isInitialized();

  useEffect(() => {
    // If not loaded and not currently loading, trigger initialization
    if (!isLoaded && !isLoading && !error) {
      logger.info('Starting Firebase initialization');
      dispatch(initializeFirebase());
    }
  }, [dispatch, isLoaded, isLoading, error]);

  // Standard loading state pattern
  if (isLoaded && isFullyInitialized) {
    return <>{children}</>;
  }

  if (error) {
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
          Initialization Error
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

  // Loading state
  const loadingMessage = !isLoaded 
    ? 'Initializing Firebase...'
    : !serviceManager.isInitialized()
      ? 'Initializing Services...'
      : 'Loading...';

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
        {loadingMessage}
      </Text>
    </View>
  );
} 