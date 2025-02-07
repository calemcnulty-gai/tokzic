import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { useTheme } from '../theme/ThemeProvider';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}; 