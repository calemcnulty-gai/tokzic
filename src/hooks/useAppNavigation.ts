import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import analytics from '@react-native-firebase/analytics';
import {
  navigateTo,
  navigationComplete,
  setDeepLink,
  clearDeepLink,
  goBack,
  type RouteType,
} from '../store/slices/navigationSlice';
import type { RootState, AppDispatch } from '../store';
import { RootStackParamList } from '../navigation/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('useAppNavigation');

export function useAppNavigation() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const navigationState = useNavigationState(state => state);
  
  const {
    currentRoute,
    previousRoute,
    deepLinkPending,
    isNavigating,
    authRequiredRoutes,
  } = useSelector((state: RootState) => state.navigation);
  
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

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
          // Log navigation event to analytics
          await analytics().logEvent('screen_view', {
            screen_name: currentRoute,
            previous_screen: previousRoute,
          });

          // Perform the navigation
          navigation.navigate(currentRoute);
          dispatch(navigationComplete());
        } catch (error) {
          logger.error('Navigation failed', { 
            to: currentRoute, 
            error 
          });
        }
      };

      navigate();
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