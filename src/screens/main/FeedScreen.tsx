import React from 'react';
import { View, FlatList, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TabParamList } from '../../navigation/types';
import { styled } from 'nativewind';

const StyledView = styled(View);

type Props = NativeStackScreenProps<TabParamList, 'Feed'>;

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

export const FeedScreen: React.FC<Props> = () => {
  // Temporary mock data
  const mockVideos = [
    { id: '1', url: 'placeholder1' },
    { id: '2', url: 'placeholder2' },
    { id: '3', url: 'placeholder3' },
  ];

  const renderItem = ({ item }: { item: { id: string; url: string } }) => (
    <StyledView className="h-screen justify-center items-center bg-background">
      {/* Video component will go here */}
    </StyledView>
  );

  return (
    <StyledView className="flex-1 bg-background">
      <FlatList
        data={mockVideos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={WINDOW_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
      />
    </StyledView>
  );
}; 