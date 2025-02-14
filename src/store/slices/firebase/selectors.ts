import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../types';
import { isValidCache, CACHE_TTL } from './utils/cache';
import type { CacheState } from '../../types';
import { serviceManager } from './services/ServiceManager';

// Type for Firebase selectors to avoid coupling to non-Firebase state
type FirebaseStateSelector = Pick<RootState, 'firebase'>;

// Initialization state selectors
export const selectIsInitialized = (state: FirebaseStateSelector) => state.firebase.isInitialized;
export const selectIsInitializing = (state: FirebaseStateSelector) => state.firebase.isInitializing;
export const selectInitError = (state: FirebaseStateSelector) => state.firebase.error;

// New selector for service initialization
export const selectServicesInitialized = createSelector(
  [selectIsInitialized, selectInitError],
  (isInitialized, error) => {
    if (!isInitialized || error) return false;
    return serviceManager.isInitialized();
  }
);

// Auth state selectors
export const selectUser = (state: FirebaseStateSelector) => state.firebase.user;
export const selectIsAuthLoading = (state: FirebaseStateSelector) => state.firebase.loadingStates.auth.isInitializing;

// Loading state selectors
export const selectAuthLoadingStates = (state: FirebaseStateSelector) => state.firebase.loadingStates.auth;
export const selectFirestoreLoadingStates = (state: FirebaseStateSelector) => state.firebase.loadingStates.firestore;
export const selectStorageLoadingStates = (state: FirebaseStateSelector) => state.firebase.loadingStates.storage;

// Error state selectors - using the error field from LoadingState
export const selectAuthError = (state: FirebaseStateSelector) => state.firebase.error;
export const selectFirestoreError = (state: FirebaseStateSelector) => state.firebase.error;
export const selectStorageError = (state: FirebaseStateSelector) => state.firebase.error;

// Cache selectors
export const selectCache = (state: FirebaseStateSelector) => state.firebase.cache;

export const selectCachedDocument = <T>(collectionName: string, documentId: string) =>
  createSelector(
    selectCache,
    (cache: CacheState) => {
      const key = `${collectionName}/${documentId}`;
      const entry = cache.documents[key];
      if (!entry) return undefined;
      return Date.now() - entry.timestamp < CACHE_TTL ? entry.data as T : undefined;
    }
  );

// Upload progress selectors
export const selectUploadProgress = (state: FirebaseStateSelector) => state.firebase.uploadProgress;
export const selectUploadProgressForPath = (path: string) =>
  createSelector(
    selectUploadProgress,
    (progress) => progress[path] || 0
  );

// Composite selectors
export const selectIsAnyAuthLoading = createSelector(
  [selectAuthLoadingStates],
  (loadingStates) => Object.values(loadingStates).some(Boolean)
);

export const selectIsAnyFirestoreLoading = createSelector(
  [selectFirestoreLoadingStates],
  (loadingStates) => Object.values(loadingStates).some(Boolean)
);

export const selectIsAnyStorageLoading = createSelector(
  [selectStorageLoadingStates],
  (loadingStates) => Object.values(loadingStates).some(Boolean)
);

export const selectHasAuthError = createSelector(
  [selectAuthError],
  (error) => !!error
);

export const selectHasFirestoreError = createSelector(
  [selectFirestoreError],
  (error) => !!error
);

export const selectHasStorageError = createSelector(
  [selectStorageError],
  (error) => !!error
);

// Cache validity selectors
export const selectIsCacheValid = createSelector(
  [(state: FirebaseStateSelector) => state.firebase.cache, (_, type: keyof CacheState, key: string) => ({ type, key })],
  (cache, { type, key }) => {
    const entry = cache[type][key];
    return entry ? Date.now() - entry.timestamp < CACHE_TTL : false;
  }
);

export const selectCacheSize = createSelector(
  [(state: FirebaseStateSelector) => state.firebase.cache, (_, type: keyof CacheState) => type],
  (cache, type) => Object.keys(cache[type]).length
);

export const selectTotalCacheSize = createSelector(
  [(state: FirebaseStateSelector) => state.firebase.cache],
  (cache) => Object.values(cache).reduce(
    (total, typeCache) => total + Object.keys(typeCache).length,
    0
  )
);

export const selectCacheTimestamp = createSelector(
  [(state: FirebaseStateSelector) => state.firebase.cache, (_, type: keyof CacheState, key: string) => ({ type, key })],
  (cache, { type, key }) => cache[type][key]?.timestamp
);

export const selectCacheAge = createSelector(
  [selectCacheTimestamp],
  (timestamp) => timestamp ? Date.now() - timestamp : null
); 