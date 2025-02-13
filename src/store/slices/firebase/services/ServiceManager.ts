import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseAuthService } from './auth';
import { FirestoreService } from './firestore';
import { StorageService } from './storage';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger('ServiceManager');

export interface ServiceState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Manages Firebase service instances outside of Redux
 * This prevents non-serializable values from being stored in Redux
 */
class ServiceManager {
  private static instance: ServiceManager;
  
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  
  private authService: FirebaseAuthService | null = null;
  private firestoreService: FirestoreService | null = null;
  private storageService: StorageService | null = null;

  private state: ServiceState = {
    isLoading: false,
    isInitialized: false,
    error: null
  };

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initializeServices(services: {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    storage: FirebaseStorage;
  }): Promise<void> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      
      logger.info('Initializing services');
      this.app = services.app;
      this.auth = services.auth;
      this.db = services.db;
      this.storage = services.storage;

      this.authService = new FirebaseAuthService(services.auth);
      this.firestoreService = new FirestoreService(services.db);
      this.storageService = new StorageService(services.storage);

      this.state.isInitialized = true;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Failed to initialize services';
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  getAuthService(): FirebaseAuthService {
    if (!this.authService) {
      logger.error('Auth service not initialized');
      throw new Error('Auth service not initialized');
    }
    return this.authService;
  }

  getFirestoreService(): FirestoreService {
    if (!this.firestoreService) {
      logger.error('Firestore service not initialized');
      throw new Error('Firestore service not initialized');
    }
    return this.firestoreService;
  }

  getStorageService(): StorageService {
    if (!this.storageService) {
      logger.error('Storage service not initialized');
      throw new Error('Storage service not initialized');
    }
    return this.storageService;
  }

  getState(): ServiceState {
    return { ...this.state };
  }

  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  cleanup(): void {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.authService = null;
    this.firestoreService = null;
    this.storageService = null;
    
    this.state = {
      isLoading: false,
      isInitialized: false,
      error: null
    };
  }
}

export const serviceManager = ServiceManager.getInstance(); 