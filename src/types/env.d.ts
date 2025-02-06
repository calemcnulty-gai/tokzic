declare module '@env' {
  export const FIREBASE_API_KEY: string;
  export const FIREBASE_AUTH_DOMAIN: string;
  export const FIREBASE_PROJECT_ID: string;
  export const FIREBASE_STORAGE_BUCKET: string;
  export const FIREBASE_MESSAGING_SENDER_ID: string;
  export const FIREBASE_APP_ID: string;
  
  // App Configuration
  export const APP_ENV: 'development' | 'staging' | 'production';
  export const ENABLE_ANALYTICS: string;
  export const LOG_LEVEL: string;
  
  // API Configuration
  export const API_URL: string;
  export const API_VERSION: string;
} 