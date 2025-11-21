// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUdY1lVy5FRbnSIUFCq2m8SJIW1vMibdk",
  authDomain: "dahacks-13303.firebaseapp.com",
  projectId: "dahacks-13303",
  storageBucket: "dahacks-13303.firebasestorage.app",
  messagingSenderId: "627802289784",
  appId: "1:627802289784:web:0ed41744e3065bdb78df8d"
};

// Initialize Firebase - check if already initialized
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth differently for web vs mobile
let auth;
try {
  if (Platform.OS === 'web') {
    // For web, use regular getAuth
    auth = getAuth(app);
  } else {
    // For React Native, try to get existing auth or initialize new one
    try {
      auth = getAuth(app);
    } catch (error) {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
  }
} catch (error) {
  console.error('Firebase auth initialization error:', error);
  // Fallback to basic getAuth
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;