import { app, db } from '../config/firebase';
import auth from '@react-native-firebase/auth';
import { getStorage } from '@react-native-firebase/storage';

// Initialize services
const firebaseAuth = auth();
const storage = getStorage();

// Export Firebase services
export { app, firebaseAuth as auth, db as firestore, storage }; 