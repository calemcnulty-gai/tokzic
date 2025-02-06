import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

console.log('Firebase Config:', {
  apiKey: FIREBASE_API_KEY ? '[PRESENT]' : '[MISSING]',
  authDomain: FIREBASE_AUTH_DOMAIN ? '[PRESENT]' : '[MISSING]',
  projectId: FIREBASE_PROJECT_ID ? '[PRESENT]' : '[MISSING]',
  storageBucket: FIREBASE_STORAGE_BUCKET ? '[PRESENT]' : '[MISSING]',
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID ? '[PRESENT]' : '[MISSING]',
  appId: FIREBASE_APP_ID ? '[PRESENT]' : '[MISSING]',
});

let app;
let auth;
let db;
let storage;

try {
  // Initialize Firebase
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('Firebase initialized successfully');
  
  // Initialize Auth with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { app, auth, db, storage }; 