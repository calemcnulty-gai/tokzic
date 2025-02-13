import { useEffect } from 'react';
import type { LoadingState } from '../types/state';

/**
 * Base hook for implementing standard loading state pattern
 * @param state Current loading state
 * @param load Function to trigger loading if needed
 * @returns The loading state
 */
export function useLoadingState(
  state: LoadingState,
  load: () => void
): LoadingState {
  useEffect(() => {
    if (!state.isLoaded && !state.isLoading && !state.error) {
      load();
    }
  }, [state.isLoaded, state.isLoading, state.error, load]);

  return state;
} 