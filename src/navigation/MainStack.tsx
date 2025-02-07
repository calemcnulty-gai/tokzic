import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { useTheme } from '../theme/ThemeProvider';

const Stack = createNativeStackNavigator<MainStackParamList>();
const StyledView = styled(View);
const StyledText = styled(Text);

// Temporary placeholder screens
const VideoDetailScreen = () => (
  <StyledView className="flex-1 justify-center items-center bg-background-primary">
    <StyledText className="text-text-primary">Video Detail</StyledText>
  </StyledView>
);

const SettingsScreen = () => (
  <StyledView className="flex-1 justify-center items-center bg-background-primary">
    <StyledText className="text-text-primary">Settings</StyledText>
  </StyledView>
);

export const MainStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}; 