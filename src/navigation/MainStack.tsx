import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { useTheme } from '../theme/ThemeProvider';

const Stack = createNativeStackNavigator<MainStackParamList>();

// Temporary placeholder screens
const VideoDetailScreen = () => (
  <View className="flex-1 justify-center items-center bg-background-primary">
    <Text className="text-text-primary">Video Detail</Text>
  </View>
);

const SettingsScreen = () => (
  <View className="flex-1 justify-center items-center bg-background-primary">
    <Text className="text-text-primary">Settings</Text>
  </View>
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
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}; 