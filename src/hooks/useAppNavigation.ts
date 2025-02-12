import { useEffect, useCallback } from 'react';
import { useNavigation, useNavigationState, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  navigateTo,
  navigationComplete,
  setDeepLink,
  clearDeepLink,
  goBack,
  type RouteType,
} from '../store/slices/navigationSlice';
import type { RootState, AppDispatch } from '../store/types';
import { RootStackParamList } from '../navigation/types';
import { createLogger } from '../utils/logger';
import { useAppDispatch, useAppSelector } from '../store/hooks';

const logger = createLogger('useAppNavigation');

export function useAppNavigation() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const navigationState = useNavigationState(state => state);
  const route = useRoute();
  
  const {
    currentRoute,
    previousRoute,
    deepLinkPending,
    isNavigating,
    authRequiredRoutes,
  } = useAppSelector((state) => state.navigation);
  
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Handle deep linking
  useEffect(() => {
    if (deepLinkPending) {
      // Parse the deep link and navigate accordingly
      try {
        const url = new URL(deepLinkPending);
        const path = url.pathname.slice(1) as RouteType; // Remove leading slash
        
        if (authRequiredRoutes.includes(path) && !isAuthenticated) {
          dispatch(navigateTo('auth'));
        } else {
          dispatch(navigateTo(path));
        }
        dispatch(clearDeepLink());
      } catch (error) {
        logger.error('Failed to handle deep link', { 
          link: deepLinkPending, 
          error 
        });
        dispatch(clearDeepLink());
      }
    }
  }, [deepLinkPending, dispatch, authRequiredRoutes, isAuthenticated]);

  // Sync navigation state with Redux
  useEffect(() => {
    if (isNavigating) {
      const navigate = async () => {
        try {

          // Perform the navigation
          navigation.navigate(
            currentRoute === 'auth' ? 'AuthStack' : 'MainStack'
          );
          dispatch(navigationComplete());
        } catch (error) {
          logger.error('Navigation failed', { 
            to: currentRoute, 
            error 
          });
        }
      };

      void navigate();
    }
  }, [isNavigating, currentRoute, previousRoute, navigation, dispatch]);

  const navigateWithAuth = useCallback((route: RouteType) => {
    if (authRequiredRoutes.includes(route) && !isAuthenticated) {
      dispatch(navigateTo('auth'));
    } else {
      dispatch(navigateTo(route));
    }
  }, [dispatch, authRequiredRoutes, isAuthenticated]);

  const handleDeepLink = useCallback((url: string) => {
    dispatch(setDeepLink(url));
  }, [dispatch]);

  const handleBack = useCallback(() => {
    dispatch(goBack());
  }, [dispatch]);

  return {
    currentRoute,
    previousRoute,
    isNavigating,
    navigateWithAuth,
    handleDeepLink,
    handleBack,
    navigationState,
  };
} 