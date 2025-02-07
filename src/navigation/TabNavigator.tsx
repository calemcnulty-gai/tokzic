import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import { FeedScreen } from '../screens/main/FeedScreen';
import { DiscoverScreen } from '../screens/main/DiscoverScreen';
import { useTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator<TabParamList>();
const StyledView = styled(View);
const StyledText = styled(Text);

// Temporary placeholder screens
const CreateScreen = () => (
  <StyledView class="flex-1 justify-center items-center bg-background-primary">
    <StyledText class="text-text-primary">Create</StyledText>
  </StyledView>
);

const NotificationsScreen = () => (
  <StyledView class="flex-1 justify-center items-center bg-background-primary">
    <StyledText class="text-text-primary">Notifications</StyledText>
  </StyledView>
);

const ProfileScreen = () => (
  <StyledView class="flex-1 justify-center items-center bg-background-primary">
    <StyledText class="text-text-primary">Profile</StyledText>
  </StyledView>
);

export const TabNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopColor: theme.colors.border.default,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.colors.neon.green,
        tabBarInactiveTintColor: theme.colors.text.muted,
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateScreen}
        options={{
          tabBarLabel: 'Create',
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Inbox',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}; 