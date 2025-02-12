import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { createLogger } from '../../utils/logger';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAppDispatch } from '../../store/hooks';
import { useSelector } from 'react-redux';
import { signIn, signUp, signInWithGoogle as signInWithGoogleAction } from '../../store/slices/authSlice';
import { selectAuthLoadingStates } from '../../store/slices/firebase/selectors';

const logger = createLogger('AuthScreen');

type Props = NativeStackScreenProps<AuthStackParamList, 'Auth'>;

export function AuthScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { isSigningIn, isSigningUp } = useSelector(selectAuthLoadingStates);
  
  const isLoading = isSigningIn || isSigningUp;

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      logger.info(`Starting email ${isSignUp ? 'sign up' : 'sign in'}`);
      await dispatch(
        isSignUp 
          ? signUp({ email, password })
          : signIn({ email, password })
      ).unwrap();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      logger.error(`Unexpected error during email ${isSignUp ? 'sign up' : 'sign in'}`, { 
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      Alert.alert('Authentication Error', errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      logger.info('Initiating Google sign in');
      await dispatch(signInWithGoogleAction()).unwrap();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      logger.error('Unexpected error during Google sign in', { 
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      Alert.alert('Authentication Error', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Icon 
              name="logo-electron" 
              size={64} 
              color={theme.colors.neon.pink}
            />
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Welcome to Tokzic
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.muted }]}>
              {isSignUp ? 'Create an account' : 'Sign in to continue'}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border
              }]}
              placeholder="Email"
              placeholderTextColor={theme.colors.text.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />

            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border
              }]}
              placeholder="Password"
              placeholderTextColor={theme.colors.text.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { 
                backgroundColor: theme.colors.neon.pink,
                opacity: isLoading ? 0.7 : 1
              }]}
              onPress={handleEmailAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.text.primary} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: theme.colors.text.primary }]}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              <Text style={[styles.switchModeText, { color: theme.colors.text.muted }]}>
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.text.muted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, { 
                backgroundColor: theme.colors.background.secondary,
                opacity: isLoading ? 0.7 : 1
              }]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Icon 
                name="logo-google" 
                size={24} 
                color={theme.colors.text.primary}
              />
              <Text style={[styles.googleButtonText, { color: theme.colors.text.primary }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeText: {
    fontSize: 14,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});