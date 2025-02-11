import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';
import { RootState } from '../';

const logger = createLogger('UISlice');

interface UIState {
  // Visibility States
  isCommentsVisible: boolean;
  isOverlayVisible: boolean;
  isTipSelectorVisible: boolean;
  
  // Modal and Toast States
  activeModal: string | null;
  toasts: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }[];

  // Loading States
  loadingStates: {
    isLoadingComments: boolean;
    isSubmittingComment: boolean;
    isProcessingTip: boolean;
    isProcessingLike: boolean;
  };
}

const initialState: UIState = {
  // Visibility States
  isCommentsVisible: false,
  isOverlayVisible: true,
  isTipSelectorVisible: false,

  // Modal and Toast States
  activeModal: null,
  toasts: [],

  // Loading States
  loadingStates: {
    isLoadingComments: false,
    isSubmittingComment: false,
    isProcessingTip: false,
    isProcessingLike: false,
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
      type: 'success' | 'error' | 'info';
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
      key: keyof UIState['loadingStates'];
      value: boolean;
    }>) => {
      state.loadingStates[action.payload.key] = action.payload.value;
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

export const selectAllLoadingStates = (state: RootState) => 
  state.ui.loadingStates;

export const selectIsLoadingComments = (state: RootState) => 
  state.ui.loadingStates.isLoadingComments;

export const selectIsSubmittingComment = (state: RootState) => 
  state.ui.loadingStates.isSubmittingComment;

export const selectIsProcessingTip = (state: RootState) => 
  state.ui.loadingStates.isProcessingTip;

export const selectIsProcessingLike = (state: RootState) => 
  state.ui.loadingStates.isProcessingLike;

// Combined selectors
export const selectInteractionLoadingStates = (state: RootState) => ({
  isLoadingComments: state.ui.loadingStates.isLoadingComments,
  isSubmittingComment: state.ui.loadingStates.isSubmittingComment,
  isProcessingTip: state.ui.loadingStates.isProcessingTip,
  isProcessingLike: state.ui.loadingStates.isProcessingLike
});

// Combined loading states selector
export const selectCombinedLoadingState = (state: RootState) => ({
  isLoadingComments: state.ui.loadingStates.isLoadingComments,
  isSubmittingComment: state.ui.loadingStates.isSubmittingComment,
  isProcessingLike: state.ui.loadingStates.isProcessingLike,
  isProcessingTip: state.ui.loadingStates.isProcessingTip,
  isProcessingVideo: state.video.loadingStates.isProcessingVideo,
  isLoadingMetadata: state.video.loadingStates.isLoadingMetadata
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