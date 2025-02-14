import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { useAuth } from '../hooks/useAuth';
import { createLogger } from '../utils/logger';
import { ActivityIndicator, View } from 'react-native';

const logger = createLogger('RootNavigator');
const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { 
    isAuthenticated, 
    isInitialized,
    loadingStates,
    user
  } = useAuth();

  // Show loading state while auth is initializing
  if (!isInitialized || loadingStates.isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  logger.debug('Rendering root navigator', { 
    isAuthenticated,
    isInitialized,
    userId: user?.uid,
    loadingStates
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
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