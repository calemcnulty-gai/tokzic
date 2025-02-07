import 'react-native-reanimated';
import React from 'react';
import { StatusBar, SafeAreaView } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { styled } from 'nativewind';
import { PortalProvider } from '@gorhom/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const StyledSafeAreaView = styled(SafeAreaView);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PortalProvider>
        <ThemeProvider>
          <StyledSafeAreaView className="flex-1 bg-background-primary">
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
            <RootNavigator />
          </StyledSafeAreaView>
        </ThemeProvider>
      </PortalProvider>
    </GestureHandlerRootView>
  );
}
