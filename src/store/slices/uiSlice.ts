import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import { RootState } from '../';

const logger = createLogger('UISlice');

interface LoadingState {
  isLoading: boolean;  // Currently loading
  isLoaded: boolean;   // Successfully loaded
  error: string | null // Any error that occurred
}

interface UILoadingStates {
  comments: LoadingState;
  tip: LoadingState;
  like: LoadingState;
}

interface UIState extends LoadingState {
  // Visibility States
  isCommentsVisible: boolean;
  isOverlayVisible: boolean;
  isTipSelectorVisible: boolean;
  
  // Modal and Toast States
  activeModal: string | null;
  toasts: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }[];

  // Loading States
  loadingStates: UILoadingStates;
}

const initialState: UIState = {
  // Root loading state
  isLoading: false,
  isLoaded: false,
  error: null,

  // Visibility States
  isCommentsVisible: false,
  isOverlayVisible: true,
  isTipSelectorVisible: false,

  // Modal and Toast States
  activeModal: null,
  toasts: [],

  // Loading States
  loadingStates: {
    comments: { isLoading: false, isLoaded: false, error: null },
    tip: { isLoading: false, isLoaded: false, error: null },
    like: { isLoading: false, isLoaded: false, error: null }
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
      const { key, loading, loaded = false, error = null } = action.payload;
      state.loadingStates[key] = {
        isLoading: loading,
        isLoaded: loaded,
        error
      };
      logger.debug('Loading state updated', action.payload);
    },
  },
});

// Selectors
export const selectUIState = (state: RootState): LoadingState => ({
  isLoading: state.ui.isLoading,
  isLoaded: state.ui.isLoaded,
  error: state.ui.error
});

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

export const selectAllLoadingStates = (state: RootState) => 
  state.ui.loadingStates;

export const selectCommentsLoadingState = (state: RootState): LoadingState => 
  state.ui.loadingStates.comments;

export const selectTipLoadingState = (state: RootState): LoadingState => 
  state.ui.loadingStates.tip;

export const selectLikeLoadingState = (state: RootState): LoadingState => 
  state.ui.loadingStates.like;

export const selectIsProcessingLike = (state: RootState): boolean => 
  state.ui.loadingStates.like.isLoading;

export const selectIsProcessingTip = (state: RootState): boolean => 
  state.ui.loadingStates.tip.isLoading;

export const selectIsLoadingComments = (state: RootState): boolean => 
  state.ui.loadingStates.comments.isLoading;

export const selectIsSubmittingComment = (state: RootState): boolean => 
  state.ui.loadingStates.comments.isLoading;

// Combined loading states selector
export const selectCombinedLoadingState = (state: RootState) => ({
  comments: state.ui.loadingStates.comments,
  tip: state.ui.loadingStates.tip,
  like: state.ui.loadingStates.like
});

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