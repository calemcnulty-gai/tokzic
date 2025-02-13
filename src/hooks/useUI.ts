import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUIState,
  selectVisibilityState,
  selectActiveModal,
  selectAllToasts,
  selectAllLoadingStates,
  toggleComments,
  toggleOverlay,
  toggleTipSelector,
  showModal,
  hideModal,
  addToast,
  removeToast,
  setLoadingState
} from '../store/slices/uiSlice';
import { useLoadingState } from './useLoadingState';
import type { LoadingState } from '../types/state';

interface UseUIResult extends LoadingState {
  // Visibility state
  visibility: {
    isCommentsVisible: boolean;
    isOverlayVisible: boolean;
    isTipSelectorVisible: boolean;
  };

  // Modal state
  activeModal: string | null;

  // Toast state
  toasts: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }[];

  // Loading states
  loadingStates: {
    comments: LoadingState;
    tip: LoadingState;
    like: LoadingState;
  };

  // Actions
  toggleComments: () => void;
  toggleOverlay: () => void;
  toggleTipSelector: () => void;
  showModal: (modalId: string) => void;
  hideModal: () => void;
  addToast: (params: { message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
  removeToast: (toastId: string) => void;
  setLoadingState: (params: {
    key: 'comments' | 'tip' | 'like';
    loading: boolean;
    loaded?: boolean;
    error?: string | null;
  }) => void;
}

export function useUI(): UseUIResult {
  const dispatch = useDispatch();
  const uiState = useSelector(selectUIState);
  const visibility = useSelector(selectVisibilityState);
  const activeModal = useSelector(selectActiveModal);
  const toasts = useSelector(selectAllToasts);
  const loadingStates = useSelector(selectAllLoadingStates);

  // UI is always loaded by default, but we still use the pattern for consistency
  const loadingState = useLoadingState(uiState, () => {});

  // UI actions
  const handleToggleComments = useCallback(() => {
    dispatch(toggleComments());
  }, [dispatch]);

  const handleToggleOverlay = useCallback(() => {
    dispatch(toggleOverlay());
  }, [dispatch]);

  const handleToggleTipSelector = useCallback(() => {
    dispatch(toggleTipSelector());
  }, [dispatch]);

  const handleShowModal = useCallback((modalId: string) => {
    dispatch(showModal(modalId));
  }, [dispatch]);

  const handleHideModal = useCallback(() => {
    dispatch(hideModal());
  }, [dispatch]);

  const handleAddToast = useCallback((params: { message: string; type: 'success' | 'error' | 'info' | 'warning' }) => {
    dispatch(addToast(params));
  }, [dispatch]);

  const handleRemoveToast = useCallback((toastId: string) => {
    dispatch(removeToast(toastId));
  }, [dispatch]);

  const handleSetLoadingState = useCallback((params: {
    key: 'comments' | 'tip' | 'like';
    loading: boolean;
    loaded?: boolean;
    error?: string | null;
  }) => {
    dispatch(setLoadingState(params));
  }, [dispatch]);

  return {
    ...loadingState,
    visibility,
    activeModal,
    toasts,
    loadingStates,
    toggleComments: handleToggleComments,
    toggleOverlay: handleToggleOverlay,
    toggleTipSelector: handleToggleTipSelector,
    showModal: handleShowModal,
    hideModal: handleHideModal,
    addToast: handleAddToast,
    removeToast: handleRemoveToast,
    setLoadingState: handleSetLoadingState,
  };
} 