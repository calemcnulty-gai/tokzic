import { Middleware, AnyAction } from '@reduxjs/toolkit';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ReduxLogger');

// Actions we don't want to log (too frequent/noisy)
const IGNORED_ACTIONS = [
  'video/updatePlaybackStatus',
  'video/setQuality',
  'gesture/updatePosition',
];

// State paths we want to monitor closely
const MONITORED_PATHS = [
  'video.currentVideo',
  'video.player.isPlaying',
  'video.feed.activeIndex',
  'auth.user',
  'navigation.currentRoute',
];

const getStateValue = (state: any, path: string) => {
  return path.split('.').reduce((obj, key) => obj && obj[key], state);
};

export const loggingMiddleware: Middleware<{}, any, any> = store => next => (action: unknown) => {
  const typedAction = action as AnyAction;
  // Skip logging for ignored actions
  if (IGNORED_ACTIONS.includes(typedAction.type)) {
    return next(action);
  }

  const prevState = store.getState();
  const startTime = performance.now();

  // Log action with relevant metadata
  logger.info('Action dispatched', {
    type: typedAction.type,
    payload: typedAction.payload,
    timestamp: new Date().toISOString()
  });

  // Call next middleware/reducer
  const result = next(action);
  const nextState = store.getState();
  const duration = performance.now() - startTime;

  // Check for important state changes
  const stateChanges: Record<string, { from: any; to: any }> = {};
  let hasImportantChanges = false;

  MONITORED_PATHS.forEach(path => {
    const prevValue = getStateValue(prevState, path);
    const nextValue = getStateValue(nextState, path);

    if (prevValue !== nextValue) {
      hasImportantChanges = true;
      stateChanges[path] = {
        from: prevValue,
        to: nextValue
      };
    }
  });

  // Log state changes if any monitored paths changed
  if (hasImportantChanges) {
    logger.info('State updated', {
      action: typedAction.type,
      changes: stateChanges,
      duration: `${duration.toFixed(2)}ms`
    });
  }

  return result;
}; 