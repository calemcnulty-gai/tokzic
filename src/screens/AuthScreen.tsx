import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { signInWithGoogle } from '../services/auth';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  androidClientId: '198315157775-uq158lfqv2a6nbfcs7u0loijvsmbokmv.apps.googleusercontent.com',
});

export const AuthScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log('Starting Google Sign In...');
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('Sign In Result:', userInfo);
      
      if (userInfo) {
        const { user, error } = await signInWithGoogle(userInfo.idToken);
        if (error) {
          console.error('Sign In Error:', error);
          Alert.alert('Error', error.message);
        } else {
          console.log('Signed in successfully with Google:', user?.uid);
        }
      }
    } catch (error) {
      console.error('Unexpected Error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={isLoading}
      >
        <Icon 
          name="google" 
          size={20} 
          color="#4285F4"
          style={styles.googleIcon} 
        />
        <Text style={styles.googleButtonText}>
          {isLoading ? 'Loading...' : 'Sign in with Google'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  googleButton: {
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#dadce0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
  },
}); 