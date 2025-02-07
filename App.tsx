import React from 'react';
import { StatusBar, SafeAreaView } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { styled } from 'nativewind';

const StyledSafeAreaView = styled(SafeAreaView);

export default function App() {
  return (
    <ThemeProvider>
      <StyledSafeAreaView className="flex-1 bg-background-primary">
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <RootNavigator />
      </StyledSafeAreaView>
    </ThemeProvider>
  );
}
