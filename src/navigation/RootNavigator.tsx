import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { useAuth } from '../hooks/useAuth';
import { createLogger } from '../utils/logger';

const logger = createLogger('RootNavigator');
const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, isInitialized } = useAuth();

  // Wait for auth to initialize before rendering
  if (!isInitialized) {
    return null;
  }

  logger.debug('Rendering root navigator', { 
    isAuthenticated: !!user,
    userId: user?.uid
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen 
            name="MainStack" 
            component={MainStack}
          />
        ) : (
          <Stack.Screen 
            name="AuthStack" 
            component={AuthStack}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}; 