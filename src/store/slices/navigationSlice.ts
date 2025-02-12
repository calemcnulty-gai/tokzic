import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import { RootState } from '../';

const logger = createLogger('NavigationSlice');

export type RouteType = 'feed' | 'profile' | 'upload' | 'settings' | 'auth';

interface LoadingState {
  isLoading: boolean;  // Currently loading
  isLoaded: boolean;   // Successfully loaded
  error: string | null // Any error that occurred
}

interface NavigationState extends LoadingState {
  currentRoute: RouteType;
  previousRoute: RouteType | null;
  navigationHistory: RouteType[];
  deepLinkPending: string | null;
  isNavigating: boolean;
  authRequiredRoutes: RouteType[];
}

const initialState: NavigationState = {
  // Loading state
  isLoading: false,
  isLoaded: true, // Navigation is loaded by default
  error: null,

  // Navigation state
  currentRoute: 'feed',
  previousRoute: null,
  navigationHistory: ['feed'],
  deepLinkPending: null,
  isNavigating: false,
  authRequiredRoutes: ['profile', 'upload'],
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    navigateTo: (state, action: PayloadAction<RouteType>) => {
      state.isLoading = true;
      state.isLoaded = false;
      state.error = null;
      state.previousRoute = state.currentRoute;
      state.currentRoute = action.payload;
      state.navigationHistory.push(action.payload);
      state.isNavigating = true;
      logger.info('Navigating to route', { 
        from: state.previousRoute, 
        to: action.payload 
      });
    },
    navigationComplete: (state) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.isNavigating = false;
      logger.info('Navigation completed', { 
        currentRoute: state.currentRoute 
      });
    },
    navigationError: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isLoaded = false;
      state.error = action.payload;
      state.isNavigating = false;
      logger.error('Navigation error', { 
        error: action.payload,
        currentRoute: state.currentRoute 
      });
    },
    setDeepLink: (state, action: PayloadAction<string | null>) => {
      state.deepLinkPending = action.payload;
      logger.info('Deep link set', { 
        link: action.payload 
      });
    },
    clearDeepLink: (state) => {
      state.deepLinkPending = null;
      logger.info('Deep link cleared');
    },
    updateAuthRequiredRoutes: (state, action: PayloadAction<RouteType[]>) => {
      state.authRequiredRoutes = action.payload;
      logger.info('Auth required routes updated', { 
        routes: action.payload 
      });
    },
    goBack: (state) => {
      if (state.navigationHistory.length > 1) {
        state.isLoading = true;
        state.isLoaded = false;
        state.error = null;
        state.navigationHistory.pop(); // Remove current route
        const previousRoute = state.navigationHistory[state.navigationHistory.length - 1];
        state.previousRoute = state.currentRoute;
        state.currentRoute = previousRoute;
        state.isNavigating = true;
        logger.info('Navigating back', { 
          from: state.previousRoute, 
          to: previousRoute 
        });
      }
    },
    resetNavigation: (state) => {
      state.currentRoute = 'feed';
      state.previousRoute = null;
      state.navigationHistory = ['feed'];
      state.isNavigating = false;
      state.deepLinkPending = null;
      state.isLoading = false;
      state.isLoaded = true;
      state.error = null;
      logger.info('Navigation reset to initial state');
    },
  },
});

export const {
  navigateTo,
  navigationComplete,
  navigationError,
  setDeepLink,
  clearDeepLink,
  updateAuthRequiredRoutes,
  goBack,
  resetNavigation,
} = navigationSlice.actions;

// Selectors
export const selectNavigationState = (state: RootState): LoadingState => ({
  isLoading: state.navigation.isLoading,
  isLoaded: state.navigation.isLoaded,
  error: state.navigation.error
});

export const selectCurrentRoute = (state: RootState) => state.navigation.currentRoute;
export const selectPreviousRoute = (state: RootState) => state.navigation.previousRoute;
export const selectNavigationHistory = (state: RootState) => state.navigation.navigationHistory;
export const selectDeepLinkPending = (state: RootState) => state.navigation.deepLinkPending;
export const selectIsNavigating = (state: RootState) => state.navigation.isNavigating;
export const selectAuthRequiredRoutes = (state: RootState) => state.navigation.authRequiredRoutes;

export default navigationSlice.reducer; 