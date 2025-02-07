import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { styled } from 'nativewind';
import { useTheme } from '../../theme/ThemeProvider';
import { signIn, signUp, signInWithGoogle } from '../../services/auth';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView);
const StyledScrollView = styled(ScrollView);

export const AuthScreen: React.FC = () => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (response.error) {
        Alert.alert('Error', response.error.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const response = await signInWithGoogle();
      if (response.error) {
        Alert.alert('Error', response.error.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledKeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-primary"
    >
      <StyledScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <StyledView className="flex-1 justify-center p-5">
          <StyledText className="text-3xl font-bold mb-8 text-center text-text-primary">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </StyledText>
          
          <StyledTextInput
            className="bg-background-secondary text-text-primary p-4 rounded-lg mb-4"
            placeholder="Email"
            placeholderTextColor={theme.colors.text.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />
          
          <StyledTextInput
            className="bg-background-secondary text-text-primary p-4 rounded-lg mb-6"
            placeholder="Password"
            placeholderTextColor={theme.colors.text.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <StyledTouchableOpacity
            className="bg-neon-green p-4 rounded-lg mb-4 items-center"
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.background.primary} />
            ) : (
              <StyledText className="text-background-primary font-semibold text-lg">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </StyledText>
            )}
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            className="bg-background-secondary border border-border-default p-4 rounded-lg mb-4 items-center"
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <StyledText className="text-text-primary font-semibold text-lg">
              Continue with Google
            </StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
            className="p-3"
          >
            <StyledText className="text-neon-green text-center text-sm">
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledScrollView>
    </StyledKeyboardAvoidingView>
  );
};