import { createLogger } from '../utils/logger';
import { Platform } from 'react-native';

const logger = createLogger('AuthConfig');

const isDev = __DEV__;
const DEV_PORT = '19006';

// Get the development URL based on platform
const getDevUrl = () => {
  if (Platform.OS === 'ios') {
    return `http://localhost:${DEV_PORT}`;
  }
  // Android emulator uses 10.0.2.2 to access host machine's localhost
  return `http://10.0.2.2:${DEV_PORT}`;
};

export const AUTH_CONFIG = {
  emailLink: {
    // Use development URL in dev mode, production URL in prod
    url: isDev 
      ? `${getDevUrl()}/auth?redirect=com.tokzic.app://auth`
      : 'https://tokzic-mobile.firebaseapp.com/auth?redirect=com.tokzic.app://auth',
    handleCodeInApp: true,
    iOS: {
      bundleId: 'com.tokzic.app',
      appStoreId: process.env.EXPO_PUBLIC_IOS_APP_STORE_ID
    },
    android: {
      packageName: 'com.tokzic.app',
      installApp: true,
      minimumVersion: '12'
    },
    // Additional required fields
    forceSameDevice: true,
    emailLinkSignIn: {
      enabled: true
    }
  }
} as const;

// Validate all required configuration
function validateConfig() {
  logger.info('Validating auth configuration', {
    isDev,
    emailLinkUrl: AUTH_CONFIG.emailLink.url
  });

  // Validate Email Link config
  const emailLinkConfig = AUTH_CONFIG.emailLink;
  logger.debug('Email Link Configuration', {
    url: emailLinkConfig.url,
    handleCodeInApp: emailLinkConfig.handleCodeInApp,
    iOS: {
      bundleId: emailLinkConfig.iOS.bundleId,
      hasAppStoreId: !!emailLinkConfig.iOS.appStoreId
    },
    android: {
      packageName: emailLinkConfig.android.packageName,
      minimumVersion: emailLinkConfig.android.minimumVersion
    },
    forceSameDevice: emailLinkConfig.forceSameDevice,
    emailLinkSignInEnabled: emailLinkConfig.emailLinkSignIn.enabled
  });

  if (!emailLinkConfig.url) {
    logger.error('Missing email link URL configuration');
    throw new Error('Email link URL is required');
  }

  if (!emailLinkConfig.iOS.bundleId) {
    logger.error('Missing iOS bundle ID configuration');
    throw new Error('iOS bundle ID is required for email link authentication');
  }

  if (!emailLinkConfig.android.packageName) {
    logger.error('Missing Android package name configuration');
    throw new Error('Android package name is required for email link authentication');
  }
}

// Run validation immediately
validateConfig();

export default AUTH_CONFIG; 