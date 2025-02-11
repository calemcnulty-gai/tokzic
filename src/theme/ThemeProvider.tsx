import React, { createContext, useContext } from 'react';
import { theme, Theme } from './theme';
import { createLogger } from '../utils/logger';

const logger = createLogger('ThemeProvider');

const ThemeContext = createContext<Theme>(theme);

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    logger.error('useTheme must be used within a ThemeProvider');
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Log mount/unmount for debugging
  React.useEffect(() => {
    logger.info('Component mounted');
    logger.debug('Theme config', theme);
    return () => logger.info('Component unmounted');
  }, []);

  logger.debug('Component rendering');
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
} 