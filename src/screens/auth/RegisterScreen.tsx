import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';

const StyledView = styled(View);
const StyledText = styled(Text);

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = () => {
  return (
    <StyledView class="flex-1 justify-center items-center bg-background-primary">
      <StyledText class="text-2xl font-bold text-text-primary">Register</StyledText>
    </StyledView>
  );
};