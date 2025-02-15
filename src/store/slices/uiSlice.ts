import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import type { RootState, Toast } from '../types';
import type { LoadingState } from '../../types/state';

const logger = createLogger('UISlice');

interface UILoadingStates {
  video: LoadingState;
  metadata: LoadingState;
}

export interface UIState {
  theme: 'light' | 'dark';
  isFullscreen: boolean;
  isSidebarOpen: boolean;
  isCommentsVisible: boolean;
  isOverlayVisible: boolean;
  isTipSelectorVisible: boolean;
  activeModal: string | null;
  toasts: Toast[];
  loadingStates: UILoadingStates;
}

const initialState: UIState = {
  theme: 'dark',
  isFullscreen: false,
  isSidebarOpen: false,
  isCommentsVisible: false,
  isOverlayVisible: true,
  isTipSelectorVisible: false,
  activeModal: null,
  toasts: [],
  loadingStates: {
    video: {
      isLoading: false,
      isLoaded: false,
      error: null
    },
    metadata: {
      isLoading: false,
      isLoaded: false,
      error: null
    }
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Visibility Actions
    toggleComments: (state) => {
      state.isCommentsVisible = !state.isCommentsVisible;
      logger.debug('Comments visibility toggled', { isVisible: state.isCommentsVisible });
    },
    toggleOverlay: (state) => {
      state.isOverlayVisible = !state.isOverlayVisible;
      logger.debug('Overlay visibility toggled', { isVisible: state.isOverlayVisible });
    },
    toggleTipSelector: (state) => {
      state.isTipSelectorVisible = !state.isTipSelectorVisible;
      logger.debug('Tip selector visibility toggled', { isVisible: state.isTipSelectorVisible });
    },

    // Modal Actions
    showModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
      logger.debug('Modal shown', { modalId: action.payload });
    },
    hideModal: (state) => {
      state.activeModal = null;
      logger.debug('Modal hidden');
    },

    // Toast Actions
    addToast: (state, action: PayloadAction<{
      message: string;
      type: 'success' | 'error' | 'info' | 'warning';
    }>) => {
      const toast = {
        id: Date.now().toString(),
        message: action.payload.message,
        type: action.payload.type,
      };
      state.toasts.push(toast);
      logger.debug('Toast added', toast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
      logger.debug('Toast removed', { toastId: action.payload });
    },

    // Loading State Actions
    setLoadingState: (state, action: PayloadAction<{
      key: keyof UILoadingStates;
      loading: boolean;
      loaded?: boolean;
      error?: string | null;
    }>) => {
      const { key, loading } = action.payload;
      state.loadingStates[key].isLoading = loading;
      logger.debug('Loading state updated', action.payload);
    },
  },
});

// Selectors
export const selectVisibilityState = (state: RootState) => ({
  isCommentsVisible: state.ui.isCommentsVisible,
  isOverlayVisible: state.ui.isOverlayVisible,
  isTipSelectorVisible: state.ui.isTipSelectorVisible
});

export const selectCommentsVisibility = (state: RootState) => 
  state.ui.isCommentsVisible;

export const selectOverlayVisibility = (state: RootState) => 
  state.ui.isOverlayVisible;

export const selectTipSelectorVisibility = (state: RootState) => 
  state.ui.isTipSelectorVisible;

export const selectActiveModal = (state: RootState) => 
  state.ui.activeModal;

export const selectAllToasts = (state: RootState) => 
  state.ui.toasts;

export const selectLatestToast = (state: RootState) => 
  state.ui.toasts[state.ui.toasts.length - 1];

// Loading state selectors
export const selectAllLoadingStates = (state: RootState) => 
  state.ui.loadingStates;

export const selectIsProcessingLike = (state: RootState): boolean => 
  state.interaction.loadingStates.likes.isLoading;

export const selectIsProcessingTip = (state: RootState): boolean => 
  state.ui.loadingStates.metadata.isLoading;

export const selectIsLoadingComments = (state: RootState): boolean => 
  state.ui.loadingStates.video.isLoading;

export const selectIsSubmittingComment = (state: RootState): boolean => 
  state.ui.loadingStates.video.isLoading;

export const {
  toggleComments,
  toggleOverlay,
  toggleTipSelector,
  showModal,
  hideModal,
  addToast,
  removeToast,
  setLoadingState,
} = uiSlice.actions;

export default uiSlice.reducer; 