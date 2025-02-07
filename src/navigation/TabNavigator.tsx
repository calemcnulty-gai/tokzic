import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { useTheme } from '../theme/ThemeProvider';
import Icon from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator<TabParamList>();
const StyledView = styled(View);
const StyledText = styled(Text);

// Temporary placeholder screens
const CreateScreen = () => (
  <StyledView className="flex-1 justify-center items-center bg-background-primary">
    <StyledText className="text-text-primary">Create</StyledText>
  </StyledView>
);

const NotificationsScreen = () => (
  <StyledView className="flex-1 justify-center items-center bg-background-primary">
    <StyledText className="text-text-primary">Notifications</StyledText>
  </StyledView>
);

const ProfileScreen = () => (
  <StyledView className="flex-1 justify-center items-center bg-background-primary">
    <StyledText className="text-text-primary">Profile</StyledText>
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
          paddingTop: 6,
          height: 60,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: theme.colors.neon.green,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 6,
        },
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Icon name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateScreen}
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({ color, size }) => (
            <Icon name="add-circle" size={32} color={theme.colors.neon.green} />
          ),
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <Icon name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}; 