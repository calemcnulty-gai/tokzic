import { app, db } from '../config/firebase';
import { getAuth } from '@react-native-firebase/auth';
import { getStorage } from '@react-native-firebase/storage';

// Initialize services
const auth = getAuth(app);
const storage = getStorage(app);

// Export Firebase services
export { app, auth, db as firestore, storage }; 