import { 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { createLogger } from '../../../../utils/logger';
import { User } from '../../../../types/auth';

const logger = createLogger('FirebaseAuthService');

export interface AuthServiceState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Manages Firebase authentication operations and state changes
 */
export class FirebaseAuthService {
  private auth: Auth;
  private authStateUnsubscribe: (() => void) | null = null;
  private googleProvider: GoogleAuthProvider;
  private state: AuthServiceState = {
    isLoading: false,
    isInitialized: false,
    error: null
  };

  constructor(auth: Auth) {
    this.auth = auth;
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.addScope('profile');
    this.googleProvider.addScope('email');
  }

  /**
   * Gets the Firebase Auth instance
   */
  getAuth(): Auth {
    return this.auth;
  }

  getState(): AuthServiceState {
    return { ...this.state };
  }

  /**
   * Initializes the auth state listener
   * @param onUserChange Callback for auth state changes
   * @returns Promise that resolves when initial auth state is determined
   */
  async initializeAuthState(onUserChange: (user: User | null) => void): Promise<void> {
    if (this.authStateUnsubscribe) {
      logger.info('Auth state listener already initialized');
      return;
    }

    try {
      this.state.isLoading = true;
      this.state.error = null;
      
      logger.info('Initializing auth state listener');
      
      return new Promise<void>((resolve) => {
        let isResolved = false;
        
        this.authStateUnsubscribe = onAuthStateChanged(this.auth, (firebaseUser) => {
          try {
            if (isResolved) return;

            if (firebaseUser) {
              logger.info('User authenticated', { 
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isEmailVerified: firebaseUser.emailVerified
              });
              onUserChange(this.mapFirebaseUser(firebaseUser));
            } else {
              logger.info('No user authenticated');
              onUserChange(null);
            }

            this.state.isInitialized = true;
            
            // Resolve after a short delay to ensure state is properly updated
            setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                resolve();
              }
            }, 1000);
          } catch (error) {
            logger.error('Error in auth state listener', { error });
            this.state.error = error instanceof Error ? error.message : 'Auth state listener error';
            if (!isResolved) {
              isResolved = true;
              resolve();
            }
          }
        });
      });
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Signs in a user with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      
      logger.info('Attempting sign in', { email });
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      logger.error('Sign in failed', { error, email });
      this.state.error = error instanceof Error ? error.message : 'Sign in failed';
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Creates a new user account
   */
  async signUp(email: string, password: string): Promise<User> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      
      logger.info('Attempting sign up', { email });
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      logger.error('Sign up failed', { error, email });
      this.state.error = error instanceof Error ? error.message : 'Sign up failed';
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Signs out the current user
   */
  async signOut(): Promise<void> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      
      logger.info('Attempting sign out');
      await firebaseSignOut(this.auth);
    } catch (error) {
      logger.error('Sign out failed', { error });
      this.state.error = error instanceof Error ? error.message : 'Sign out failed';
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Cleans up auth state listener
   */
  cleanup(): void {
    if (this.authStateUnsubscribe) {
      logger.info('Cleaning up auth state listener');
      this.authStateUnsubscribe();
      this.authStateUnsubscribe = null;
    }
    this.state = {
      isLoading: false,
      isInitialized: false,
      error: null
    };
  }

  /**
   * Maps Firebase user to our User type
   */
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isAnonymous: firebaseUser.isAnonymous,
    };
  }

  /**
   * Signs in with Google using popup
   * Falls back to redirect on mobile
   */
  async signInWithGoogle(): Promise<User> {
    try {
      logger.info('Attempting Google sign in');
      
      let result;
      if (this.isMobile()) {
        await signInWithRedirect(this.auth, this.googleProvider);
        result = await getRedirectResult(this.auth);
      } else {
        result = await signInWithPopup(this.auth, this.googleProvider);
      }

      if (!result?.user) {
        throw new Error('No user returned from Google sign in');
      }

      return this.mapFirebaseUser(result.user);
    } catch (error) {
      logger.error('Google sign in failed', { error });
      throw error;
    }
  }

  /**
   * Checks if the current environment is mobile
   */
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);
  }
} 