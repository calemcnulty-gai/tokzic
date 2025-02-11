import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';

const logger = createLogger('NavigationSlice');

export type RouteType = 'feed' | 'profile' | 'upload' | 'settings' | 'auth';

interface NavigationState {
  currentRoute: RouteType;
  previousRoute: RouteType | null;
  navigationHistory: RouteType[];
  deepLinkPending: string | null;
  isNavigating: boolean;
  authRequiredRoutes: RouteType[];
}

const initialState: NavigationState = {
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
      state.isNavigating = false;
      logger.info('Navigation completed', { 
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
      logger.info('Navigation reset to initial state');
    },
  },
});

export const {
  navigateTo,
  navigationComplete,
  setDeepLink,
  clearDeepLink,
  updateAuthRequiredRoutes,
  goBack,
  resetNavigation,
} = navigationSlice.actions;

export default navigationSlice.reducer; 