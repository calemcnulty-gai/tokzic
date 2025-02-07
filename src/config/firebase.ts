import firebase from '@react-native-firebase/app';

// Initialize Firebase if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp();
}

export default firebase; 