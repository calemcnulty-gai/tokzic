import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectNavigationState,
  selectCurrentRoute,
  selectPreviousRoute,
  selectNavigationHistory,
  selectDeepLinkPending,
  selectIsNavigating,
  selectAuthRequiredRoutes,
  navigateTo,
  navigationComplete,
  navigationError,
  setDeepLink,
  clearDeepLink,
  updateAuthRequiredRoutes,
  goBack,
  resetNavigation,
  type RouteType
} from '../store/slices/navigationSlice';
import { useLoadingState } from './useLoadingState';
import type { LoadingState } from '../types/state';

interface UseNavigationResult extends LoadingState {
  // Navigation state
  currentRoute: RouteType;
  previousRoute: RouteType | null;
  navigationHistory: RouteType[];
  deepLinkPending: string | null;
  isNavigating: boolean;
  authRequiredRoutes: RouteType[];

  // Actions
  navigateTo: (route: RouteType) => void;
  navigationComplete: () => void;
  navigationError: (error: string) => void;
  setDeepLink: (link: string | null) => void;
  clearDeepLink: () => void;
  updateAuthRequiredRoutes: (routes: RouteType[]) => void;
  goBack: () => void;
  resetNavigation: () => void;
}

export function useNavigation(): UseNavigationResult {
  const dispatch = useDispatch();
  const navigationState = useSelector(selectNavigationState);
  const currentRoute = useSelector(selectCurrentRoute);
  const previousRoute = useSelector(selectPreviousRoute);
  const navigationHistory = useSelector(selectNavigationHistory);
  const deepLinkPending = useSelector(selectDeepLinkPending);
  const isNavigating = useSelector(selectIsNavigating);
  const authRequiredRoutes = useSelector(selectAuthRequiredRoutes);

  // Navigation is always loaded by default, but we still use the pattern for consistency
  const loadingState = useLoadingState(navigationState, () => {});

  // Navigation actions
  const handleNavigateTo = useCallback((route: RouteType) => {
    dispatch(navigateTo(route));
  }, [dispatch]);

  const handleNavigationComplete = useCallback(() => {
    dispatch(navigationComplete());
  }, [dispatch]);

  const handleNavigationError = useCallback((error: string) => {
    dispatch(navigationError(error));
  }, [dispatch]);

  const handleSetDeepLink = useCallback((link: string | null) => {
    dispatch(setDeepLink(link));
  }, [dispatch]);

  const handleClearDeepLink = useCallback(() => {
    dispatch(clearDeepLink());
  }, [dispatch]);

  const handleUpdateAuthRequiredRoutes = useCallback((routes: RouteType[]) => {
    dispatch(updateAuthRequiredRoutes(routes));
  }, [dispatch]);

  const handleGoBack = useCallback(() => {
    dispatch(goBack());
  }, [dispatch]);

  const handleResetNavigation = useCallback(() => {
    dispatch(resetNavigation());
  }, [dispatch]);

  return {
    ...loadingState,
    currentRoute,
    previousRoute,
    navigationHistory,
    deepLinkPending,
    isNavigating,
    authRequiredRoutes,
    navigateTo: handleNavigateTo,
    navigationComplete: handleNavigationComplete,
    navigationError: handleNavigationError,
    setDeepLink: handleSetDeepLink,
    clearDeepLink: handleClearDeepLink,
    updateAuthRequiredRoutes: handleUpdateAuthRequiredRoutes,
    goBack: handleGoBack,
    resetNavigation: handleResetNavigation,
  };
} 