import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../';
import { isValidCache } from './utils/cache';
import type { CacheState } from './firebaseSlice';
import { serviceManager } from './services/ServiceManager';

// Initialization state selectors
export const selectIsInitialized = (state: RootState) => state.firebase.isInitialized;
export const selectIsInitializing = (state: RootState) => state.firebase.isInitializing;
export const selectInitError = (state: RootState) => state.firebase.error;

// New selector for service initialization
export const selectServicesInitialized = createSelector(
  [selectIsInitialized, selectInitError],
  (isInitialized, error) => {
    if (!isInitialized || error) return false;
    return serviceManager.isInitialized();
  }
);

// Auth state selectors
export const selectUser = (state: RootState) => state.firebase.user;
export const selectIsAuthLoading = (state: RootState) => state.firebase.isAuthLoading;
export const selectAuthError = (state: RootState) => state.firebase.authError;

// Loading state selectors
export const selectAuthLoadingStates = (state: RootState) => state.firebase.loadingStates.auth;
export const selectFirestoreLoadingStates = (state: RootState) => state.firebase.loadingStates.firestore;
export const selectStorageLoadingStates = (state: RootState) => state.firebase.loadingStates.storage;

// Error state selectors
export const selectAuthErrors = (state: RootState) => state.firebase.errors.auth;
export const selectFirestoreErrors = (state: RootState) => state.firebase.errors.firestore;
export const selectStorageErrors = (state: RootState) => state.firebase.errors.storage;

// Cache selectors
export const selectCache = (state: RootState) => state.firebase.cache;

export const selectCachedDocument = <T>(collectionName: string, documentId: string) =>
  createSelector(
    selectCache,
    (cache: CacheState) => {
      const key = `${collectionName}/${documentId}`;
      const entry = cache.documents[key];
      return isValidCache(entry) ? entry.data as T : undefined;
    }
  );

// Upload progress selectors
export const selectUploadProgress = (state: RootState) => state.firebase.uploadProgress;
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

export const selectHasAnyAuthError = createSelector(
  [selectAuthErrors],
  (errors) => Object.values(errors).some(Boolean)
);

export const selectHasAnyFirestoreError = createSelector(
  [selectFirestoreErrors],
  (errors) => Object.values(errors).some(Boolean)
);

export const selectHasAnyStorageError = createSelector(
  [selectStorageErrors],
  (errors) => Object.values(errors).some(Boolean)
);

// Cache validity selectors
export const selectIsCacheValid = createSelector(
  [(state: RootState) => state.firebase.cache, (_, type: keyof CacheState, key: string) => ({ type, key })],
  (cache, { type, key }) => isValidCache(cache[type], key)
);

export const selectCacheSize = createSelector(
  [(state: RootState) => state.firebase.cache, (_, type: keyof CacheState) => type],
  (cache, type) => Object.keys(cache[type]).length
);

export const selectTotalCacheSize = createSelector(
  [(state: RootState) => state.firebase.cache],
  (cache) => Object.values(cache).reduce(
    (total, typeCache) => total + Object.keys(typeCache).length,
    0
  )
);

export const selectCacheTimestamp = createSelector(
  [(state: RootState) => state.firebase.cache, (_, type: keyof CacheState, key: string) => ({ type, key })],
  (cache, { type, key }) => cache[type][key]?.timestamp
);

export const selectCacheAge = createSelector(
  [selectCacheTimestamp],
  (timestamp) => timestamp ? Date.now() - timestamp : null
); 