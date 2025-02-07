import { useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    const unsubscribe = auth().onAuthStateChanged((user) => {
      console.log('👤 Auth state changed:', {
        uid: user?.uid,
        email: user?.email,
        isAnonymous: user?.isAnonymous,
        providerId: user?.providerId,
        metadata: user?.metadata,
      });

      setState({
        user,
        loading: false,
        error: null,
      });
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await auth().signOut();
      console.log('👋 User signed out');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      setState((current) => ({
        ...current,
        error: error as Error,
      }));
    }
  };

  return {
    ...state,
    signOut,
    isAuthenticated: !!state.user,
  };
} 