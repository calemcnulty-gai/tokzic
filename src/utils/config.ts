import { Env } from '@env';

/**
 * Configuration utility to handle environment variables with type safety
 * and default values where appropriate.
 */
class Config {
  private static instance: Config;
  private env: Partial<Env>;

  private constructor() {
    this.env = process.env as unknown as Partial<Env>;
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public getApiUrl(): string {
    return this.env.API_URL || 'http://localhost:3000';
  }

  public getApiVersion(): string {
    return this.env.API_VERSION || 'v1';
  }

  public getFirebaseConfig() {
    return {
      apiKey: this.env.FIREBASE_API_KEY,
      authDomain: this.env.FIREBASE_AUTH_DOMAIN,
      projectId: this.env.FIREBASE_PROJECT_ID,
      storageBucket: this.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: this.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: this.env.FIREBASE_APP_ID,
    };
  }

  public getAppEnv(): 'development' | 'staging' | 'production' {
    return (this.env.APP_ENV as 'development' | 'staging' | 'production') || 'development';
  }

  public isAnalyticsEnabled(): boolean {
    return this.env.ENABLE_ANALYTICS === 'true';
  }

  public getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    return (this.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';
  }
}

export const config = Config.getInstance(); 