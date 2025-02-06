import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { User } from 'firebase/auth';
import { AuthScreen } from './src/screens/AuthScreen';
import { subscribeToAuthChanges } from './src/services/auth';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

// Direct console.log at the module level
console.log('Direct environment check:', {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
});

console.log('App.tsx: Starting to initialize app');
console.log('Environment Variables:', {
  FIREBASE_API_KEY: FIREBASE_API_KEY ? '[PRESENT]' : '[MISSING]',
  FIREBASE_AUTH_DOMAIN: FIREBASE_AUTH_DOMAIN ? '[PRESENT]' : '[MISSING]',
  FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID ? '[PRESENT]' : '[MISSING]',
  FIREBASE_STORAGE_BUCKET: FIREBASE_STORAGE_BUCKET ? '[PRESENT]' : '[MISSING]',
  FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID ? '[PRESENT]' : '[MISSING]',
  FIREBASE_APP_ID: FIREBASE_APP_ID ? '[PRESENT]' : '[MISSING]',
});

const App: React.FC = () => {
  console.log('App.tsx: Inside App component');
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('App.tsx: Setting up auth subscription');
    try {
      if (!FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN || !FIREBASE_PROJECT_ID) {
        throw new Error('Missing required Firebase configuration');
      }

      const unsubscribe = subscribeToAuthChanges((user) => {
        console.log('App.tsx: Auth state changed', user ? 'User present' : 'No user');
        setUser(user);
        if (initializing) {
          setInitializing(false);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('App.tsx: Error in auth subscription:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setInitializing(false);
      return () => {};
    }
  }, [initializing]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>Error: {error}</Text>
      </View>
    );
  }

  if (initializing) {
    console.log('App.tsx: Still initializing');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    );
  }

  console.log('App.tsx: Rendering main app content');
  return (
    <>
      <StatusBar style="auto" />
      {user ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* We'll replace this with actual app content later */}
        </View>
      ) : (
        <AuthScreen />
      )}
    </>
  );
};

export default App;
