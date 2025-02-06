import { initializeApp, getApps, getApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

// Firebase configuration
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Debug logging
console.log('Starting Firebase initialization...');
console.log('Current apps:', getApps().length);

console.log('Firebase Config:', {
  apiKey: FIREBASE_API_KEY ? '[PRESENT]' : '[MISSING]',
  authDomain: FIREBASE_AUTH_DOMAIN ? '[PRESENT]' : '[MISSING]',
  projectId: FIREBASE_PROJECT_ID ? '[PRESENT]' : '[MISSING]',
  storageBucket: FIREBASE_STORAGE_BUCKET ? '[PRESENT]' : '[MISSING]',
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID ? '[PRESENT]' : '[MISSING]',
  appId: FIREBASE_APP_ID ? '[PRESENT]' : '[MISSING]',
});

let app;
let db;
let fbStorage;

try {
  if (!getApps().length) {
    console.log('No existing Firebase app, initializing new one...');
    app = initializeApp({
      apiKey: FIREBASE_API_KEY,
      authDomain: FIREBASE_AUTH_DOMAIN,
      projectId: FIREBASE_PROJECT_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
      appId: FIREBASE_APP_ID,
    });
    console.log('New Firebase app initialized');
  } else {
    console.log('Using existing Firebase app');
    app = getApp();
  }

  // Initialize Firestore and Storage after app initialization
  db = firestore();
  fbStorage = storage();
  
  console.log('Firebase services initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  console.error('Error details:', JSON.stringify(error, null, 2));
  throw error;
}

export { app, db, fbStorage }; 