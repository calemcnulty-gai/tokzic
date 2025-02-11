import { runOnJS } from 'react-native-reanimated';
import { createLogger } from './logger';

type SafeErrorDetails = Record<string, string | number | boolean | undefined | null>;
const baseLogger = createLogger('Worklet');

// Worklet-safe logger that only accepts strings and simple objects
const createWorkletLogger = () => {
  'worklet';
  return {
    info: (message: string, data?: SafeErrorDetails) => {
      'worklet';
      if (data) {
        runOnJS(baseLogger.info)(message, data);
      } else {
        runOnJS(baseLogger.info)(message);
      }
    },
    error: (message: string, data?: SafeErrorDetails) => {
      'worklet';
      if (data) {
        runOnJS(baseLogger.error)(message, data);
      } else {
        runOnJS(baseLogger.error)(message);
      }
    },
    debug: (message: string, data?: SafeErrorDetails) => {
      'worklet';
      if (data) {
        runOnJS(baseLogger.debug)(message, data);
      } else {
        runOnJS(baseLogger.debug)(message);
      }
    },
    warn: (message: string, data?: SafeErrorDetails) => {
      'worklet';
      if (data) {
        runOnJS(baseLogger.warn)(message, data);
      } else {
        runOnJS(baseLogger.warn)(message);
      }
    }
  };
};

/**
 * Converts an unknown error value into a safe error message string.
 * Handles primitives, Error objects, and general objects while avoiding
 * circular references.
 */
export function safeSerializeError(error: unknown): string {
  'worklet';
  // If the error is nullish, return a default message.
  if (error == null) {
    return 'Unknown error';
  }

  // Handle primitive types directly.
  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
    return String(error);
  }

  // If error is an instance of Error, extract its properties.
  if (error instanceof Error) {
    let result = `${error.name}: ${error.message}`;
    if (error.stack) {
      result += `\nStack: ${error.stack}`;
    }
    if ('cause' in error && error.cause) {
      result += `\nCause: ${safeSerializeError((error as any).cause)}`;
    }
    return result;
  }

  // Attempt to serialize any other kind of object via JSON.stringify.
  const json = safeJsonStringify(error);
  if (json && json !== '{}') {
    return json;
  }

  // Fallback to simply calling the object's toString() method.
  try {
    return error.toString();
  } catch (e) {
    return 'Could not serialize error';
  }
}

/**
 * Safely JSON-stringifies a value, handling circular references by
 * replacing them with a placeholder.
 */
function safeJsonStringify(value: unknown): string | undefined {
  'worklet';
  const seen = new Set();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    });
  } catch (e) {
    return undefined;
  }
}

export const workletLogger = createWorkletLogger(); 