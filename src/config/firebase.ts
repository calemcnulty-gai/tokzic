import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { createLogger } from '../utils/logger';
import { LogBox } from 'react-native';

const logger = createLogger('Firebase');

// Suppress all Firebase v8 deprecation warnings
LogBox.ignoreLogs([
  /This v8 method is deprecated/,
]);

logger.info('Getting initialized Firebase app');

// Get the auto-initialized app instance
export const app = getApp();
export const db = getFirestore(app);

// Export default for backward compatibility
export default app; 