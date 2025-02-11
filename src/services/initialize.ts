import { initializeAuthListener } from './auth-listener';
import { createLogger } from '../utils/logger';
import { app } from '../config/firebase';

const logger = createLogger('Initialize');

export function initializeServices() {
  logger.info('🚀 Initializing services...');
  
  // Initialize auth listener
  const unsubscribeAuth = initializeAuthListener();
  
  // Return cleanup function
  return () => {
    logger.info('🧹 Cleaning up services...');
    unsubscribeAuth();
  };
} 