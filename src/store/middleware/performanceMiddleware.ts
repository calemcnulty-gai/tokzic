import { Middleware, Dispatch, AnyAction } from '@reduxjs/toolkit';
import analytics from '@react-native-firebase/analytics';
import { createLogger } from '../../utils/logger';
import type { RootState } from '../types';

const logger = createLogger('PerformanceMiddleware');

const PERFORMANCE_THRESHOLD = 100; // ms
const ERROR_BATCH_SIZE = 10;
const ERROR_BATCH_INTERVAL = 60000; // 1 minute

interface ErrorBatch {
  errors: Array<{
    timestamp: number;
    error: Error;
    actionType: string;
    state: Partial<RootState>;
  }>;
  lastSent: number;
}

const errorBatch: ErrorBatch = {
  errors: [],
  lastSent: Date.now(),
};

const sendErrorBatch = async () => {
  if (errorBatch.errors.length === 0) return;

  try {
    await analytics().logEvent('redux_errors', {
      count: errorBatch.errors.length,
      errors: errorBatch.errors.map(e => ({
        message: e.error.message,
        actionType: e.actionType,
        timestamp: e.timestamp,
      })),
    });

    logger.info('Error batch sent to analytics', {
      count: errorBatch.errors.length,
    });

    errorBatch.errors = [];
    errorBatch.lastSent = Date.now();
  } catch (error) {
    logger.error('Failed to send error batch', { error });
  }
};

export const performanceMiddleware: Middleware = store => next => action => {
  const startTime = performance.now();
  const typedAction = action as AnyAction;

  try {
    const result = next(action);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log slow actions
    if (duration > PERFORMANCE_THRESHOLD) {
      logger.warn('Slow action detected', {
        actionType: typedAction.type,
        duration,
        payload: typedAction.payload,
      });

      analytics().logEvent('slow_redux_action', {
        action_type: typedAction.type,
        duration,
        timestamp: Date.now(),
      });
    }

    // Track action performance
    analytics().logEvent('redux_action_performance', {
      action_type: typedAction.type,
      duration,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    // Handle and batch errors
    errorBatch.errors.push({
      timestamp: Date.now(),
      error: error as Error,
      actionType: typedAction.type,
      state: store.getState(),
    });

    logger.error('Redux action error', {
      actionType: typedAction.type,
      error,
    });

    // Send error batch if threshold reached
    if (
      errorBatch.errors.length >= ERROR_BATCH_SIZE ||
      Date.now() - errorBatch.lastSent >= ERROR_BATCH_INTERVAL
    ) {
      sendErrorBatch();
    }

    throw error;
  }
};

// Set up periodic error batch sending
setInterval(() => {
  if (Date.now() - errorBatch.lastSent >= ERROR_BATCH_INTERVAL) {
    sendErrorBatch();
  }
}, ERROR_BATCH_INTERVAL); 