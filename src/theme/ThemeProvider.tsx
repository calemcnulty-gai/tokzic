import React, { createContext, useContext } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import theme, { Theme } from './theme';

const StyledView = styled(View);

const ThemeContext = createContext<Theme>(theme);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      <StyledView className="flex-1 bg-background">
        {children}
      </StyledView>
    </ThemeContext.Provider>
  );
}; 