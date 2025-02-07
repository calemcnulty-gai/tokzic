import React from 'react';
import { StatusBar } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <RootNavigator />
    </ThemeProvider>
  );
}
