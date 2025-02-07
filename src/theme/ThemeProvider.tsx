import React, { createContext, useContext, useEffect } from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import theme, { Theme } from './theme';

const StyledView = styled(View);

const ThemeContext = createContext<Theme>(theme);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    console.error('❌ useTheme must be used within a ThemeProvider');
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  useEffect(() => {
    console.log('🎨 ThemeProvider mounted');
    console.log('🎨 Theme config:', theme);
    return () => console.log('🎨 ThemeProvider unmounted');
  }, []);

  console.log('🔄 ThemeProvider rendering');
  return (
    <ThemeContext.Provider value={theme}>
      <StyledView className="flex-1 bg-background-primary">
        {children}
      </StyledView>
    </ThemeContext.Provider>
  );
}; 