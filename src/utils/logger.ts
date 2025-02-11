// Simple logger for React Native that mimics winston's interface
// but doesn't depend on Node.js modules

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: any;
}

class Logger {
  private component: string;
  private static LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private static currentLogLevel: LogLevel = __DEV__ ? 'debug' : 'info';

  constructor(component: string) {
    this.component = component;
  }

  private formatMessage(level: LogLevel, message: string, metadata: LogMetadata = {}): string {
    const timestamp = new Date().toISOString();
    const metadataStr = Object.keys(metadata).length > 0 
      ? ` ${JSON.stringify(metadata)}`
      : '';
    
    return `${timestamp} [${level.toUpperCase()}] [${this.component}] ${message}${metadataStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.LOG_LEVELS[level] >= Logger.LOG_LEVELS[Logger.currentLogLevel];
  }

  private log(level: LogLevel, message: string, metadata: LogMetadata = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, metadata);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, metadata: LogMetadata = {}) {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata: LogMetadata = {}) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata: LogMetadata = {}) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata: LogMetadata = {}) {
    this.log('error', message, metadata);
  }

  static setLogLevel(level: LogLevel) {
    Logger.currentLogLevel = level;
  }
}

export const createLogger = (component: string) => new Logger(component);

export default Logger; 