// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUdY1lVy5FRbnSIUFCq2m8SJIW1vMibdk",
  authDomain: "dahacks-13303.firebaseapp.com",
  projectId: "dahacks-13303",
  storageBucket: "dahacks-13303.firebasestorage.app",
  messagingSenderId: "627802289784",
  appId: "1:627802289784:web:0ed41744e3065bdb78df8d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;