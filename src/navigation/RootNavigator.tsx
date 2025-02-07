import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { useAuth } from '../hooks/useAuth'; // We'll create this later

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  // Temporary auth state until we implement Firebase auth
  const isAuthenticated = true;

  useEffect(() => {
    console.log('🚀 RootNavigator mounted');
    console.log('🔑 Auth state:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
    return () => console.log('🚀 RootNavigator unmounted');
  }, [isAuthenticated]);

  console.log('🔄 RootNavigator rendering');
  return (
    <NavigationContainer
      onStateChange={(state) => {
        console.log('🧭 Navigation state changed:', state);
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen 
            name="Main" 
            component={MainStack}
            listeners={{
              focus: () => console.log('🎯 MainStack focused'),
              blur: () => console.log('🌫 MainStack blurred'),
            }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthStack}
            listeners={{
              focus: () => console.log('🎯 AuthStack focused'),
              blur: () => console.log('🌫 AuthStack blurred'),
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}; 