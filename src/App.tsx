import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './store';
import { RootNavigator } from './navigation/RootNavigator';
import { initializeServices } from './services/initialize';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

// Initialize services
const cleanup = initializeServices();

export default function App() {
  // Handle cleanup
  useEffect(() => cleanup, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer
          onStateChange={(state) => {
            logger.debug('Navigation state changed', { state });
          }}
        >
          <RootNavigator />
        </NavigationContainer>
      </GestureHandlerRootView>
    </Provider>
  );
} 