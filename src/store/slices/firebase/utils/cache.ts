import { createLogger } from '../../../../utils/logger';

const logger = createLogger('FirebaseCache');

// Cache configuration
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
export const MAX_CACHE_SIZE = 100; // Maximum number of items to cache

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface Cache<T> {
  [key: string]: CacheEntry<T>;
}

/**
 * Adds an item to the cache with timestamp
 * Removes oldest entry if cache size exceeds limit
 */
export const addToCache = <T>(
  cache: Cache<T>,
  key: string,
  data: T
): Cache<T> => {
  try {
    const newCache = { ...cache };
    newCache[key] = {
      data,
      timestamp: Date.now(),
    };

    // Remove oldest entries if cache is too large
    const keys = Object.keys(newCache);
    if (keys.length > MAX_CACHE_SIZE) {
      const oldestKey = keys.reduce((oldest, key) => {
        return newCache[key].timestamp < newCache[oldest].timestamp ? key : oldest;
      });
      delete newCache[oldestKey];
      logger.info('Removed oldest cache entry', { key: oldestKey });
    }

    return newCache;
  } catch (error) {
    logger.error('Failed to add item to cache', { key, error });
    return cache;
  }
};

/**
 * Checks if a cache entry is valid (within TTL)
 */
export const isValidCache = <T>(
  cache: Cache<T>,
  key: string
): boolean => {
  try {
    const entry = cache[key];
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
  } catch (error) {
    logger.error('Failed to check cache validity', { key, error });
    return false;
  }
};

/**
 * Removes expired entries from cache
 */
export const cleanCache = <T>(cache: Cache<T>): Cache<T> => {
  try {
    const newCache = { ...cache };
    const now = Date.now();
    
    Object.keys(newCache).forEach(key => {
      if (now - newCache[key].timestamp >= CACHE_TTL) {
        delete newCache[key];
        logger.info('Removed expired cache entry', { key });
      }
    });
    
    return newCache;
  } catch (error) {
    logger.error('Failed to clean cache', { error });
    return cache;
  }
};

/**
 * Invalidates specific cache entries
 */
export const invalidateCacheEntries = <T>(
  cache: Cache<T>,
  keys: string[]
): Cache<T> => {
  try {
    const newCache = { ...cache };
    keys.forEach(key => {
      delete newCache[key];
      logger.info('Invalidated cache entry', { key });
    });
    return newCache;
  } catch (error) {
    logger.error('Failed to invalidate cache entries', { keys, error });
    return cache;
  }
}; 