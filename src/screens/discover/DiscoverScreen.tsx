import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TabParamList } from '../../navigation/types';

const StyledView = styled(View);
const StyledText = styled(Text);

type Props = NativeStackScreenProps<TabParamList, 'Discover'>;

export const DiscoverScreen: React.FC<Props> = () => {
  return (
    <StyledView className="flex-1 justify-center items-center bg-background-primary">
      <StyledText className="text-2xl font-bold text-text-primary">Discover</StyledText>
    </StyledView>
  );
}; 