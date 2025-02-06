import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from 'firebase/auth';

const AUTH_USER_KEY = '@auth_user';
const AUTH_STATE_KEY = '@auth_state';

interface StoredAuthState {
  isAuthenticated: boolean;
  lastLoginAt: number;
}

/**
 * Persists user data to AsyncStorage
 */
export const persistUser = async (user: User | null): Promise<void> => {
  try {
    if (user) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    } else {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (error) {
    console.error('Error persisting user:', error);
  }
};

/**
 * Retrieves stored user data from AsyncStorage
 */
export const getStoredUser = async (): Promise<Partial<User> | null> => {
  try {
    const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};

/**
 * Updates the authentication state
 */
export const updateAuthState = async (isAuthenticated: boolean): Promise<void> => {
  try {
    const authState: StoredAuthState = {
      isAuthenticated,
      lastLoginAt: Date.now(),
    };
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
  } catch (error) {
    console.error('Error updating auth state:', error);
  }
};

/**
 * Gets the current authentication state
 */
export const getAuthState = async (): Promise<StoredAuthState | null> => {
  try {
    const stateJson = await AsyncStorage.getItem(AUTH_STATE_KEY);
    return stateJson ? JSON.parse(stateJson) : null;
  } catch (error) {
    console.error('Error getting auth state:', error);
    return null;
  }
};

/**
 * Clears all auth-related data from AsyncStorage
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([AUTH_USER_KEY, AUTH_STATE_KEY]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}; 