/**
 * Standard loading state interface used across the application
 */
export interface LoadingState {
  isLoading: boolean;  // Currently loading
  isLoaded: boolean;   // Successfully loaded
  error: string | null // Any error that occurred
}

/**
 * Type guard to check if a value implements LoadingState
 */
export function isLoadingState(value: unknown): value is LoadingState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isLoading' in value &&
    'isLoaded' in value &&
    'error' in value
  );
} 