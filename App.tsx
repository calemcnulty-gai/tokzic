import 'react-native-reanimated';
import './src/global.css';
import React from 'react';
import { StatusBar, SafeAreaView, View, Text, ErrorUtils } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { PortalProvider } from '@gorhom/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { FirebaseInitializer } from './src/components/FirebaseInitializer';
import { AuthInitializer } from './src/components/AuthInitializer';
import { createLogger } from './src/utils/logger';

const logger = createLogger('App');

// Ensure store is initialized before rendering
if (!store) {
  logger.error('Redux store failed to initialize');
  throw new Error('Redux store failed to initialize');
}

export default function App() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (__DEV__ && ErrorUtils) {
      const handleError = (error: Error, isFatal?: boolean) => {
        logger.error('Unhandled error in App', { error, isFatal });
        setError(error);
      };

      const originalHandler = ErrorUtils.getGlobalHandler?.() || ((error: Error) => { console.error(error); });
      
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        handleError(error, isFatal);
        originalHandler(error, isFatal);
      });

      return () => {
        if (ErrorUtils.setGlobalHandler) {
          ErrorUtils.setGlobalHandler(originalHandler);
        }
      };
    }
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F', padding: 20 }}>
        <Text style={{ color: '#FF4444', fontSize: 18, marginBottom: 10 }}>Application Error</Text>
        <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>{error.message}</Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      <ErrorBoundary>
        <FirebaseInitializer>
          <AuthInitializer>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <PortalProvider>
                <ThemeProvider>
                  <SafeAreaView className="flex-1 bg-background-primary">
                    <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
                    <RootNavigator />
                  </SafeAreaView>
                </ThemeProvider>
              </PortalProvider>
            </GestureHandlerRootView>
          </AuthInitializer>
        </FirebaseInitializer>
      </ErrorBoundary>
    </Provider>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error caught by boundary', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F', padding: 20 }}>
          <Text style={{ color: '#FF4444', fontSize: 18, marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>{this.state.error?.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}
