import { initializeAuthListener } from './auth-listener';
import { createLogger } from '../utils/logger';
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';

const logger = createLogger('Initialize');

export function initializeServices() {
  logger.info('🚀 Initializing services...');
  
  if (!serviceManager.isInitialized()) {
    logger.error('Services not initialized');
    throw new Error('Services must be initialized before calling initializeServices');
  }
  
  // Initialize auth listener
  const unsubscribeAuth = initializeAuthListener();
  
  // Return cleanup function
  return () => {
    logger.info('🧹 Cleaning up services...');
    unsubscribeAuth();
    serviceManager.cleanup();
  };
} 