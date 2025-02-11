import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('Firebase');

logger.info('Getting Firebase instances');

// Get service instances - React Native Firebase handles initialization
export const app = getApp();
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();