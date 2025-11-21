import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Alert } from 'react-native';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          picture: firebaseUser.photoURL,
          authenticated: true,
        };

        // Store user data locally
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
        setUser(userData);

        // Sync with Firestore
        await saveUserToFirestore(firebaseUser);
      } else {
        // User is signed out
        setUser(null);
        await AsyncStorage.removeItem('@user');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);


  const saveUserToFirestore = async (firebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL || null,
        lastLogin: serverTimestamp(),
        provider: firebaseUser.providerData[0]?.providerId || 'email',
      };

      if (!userSnap.exists()) {
        // New user - create document
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
          points: 0,
          level: 'Beginner',
          gamesPlayed: 0,
          highScore: 0,
        });
      } else {
        // Existing user - update last login
        await setDoc(userRef, userData, { merge: true });
      }
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  };


  const signUpWithEmail = async (email, password, name) => {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Save to Firestore (will be handled by onAuthStateChanged)
      console.log('Email sign up successful:', userCredential.user.email);

      return { success: true };
    } catch (error) {
      console.error('Error signing up with email:', error);

      // Handle specific error cases
      let errorMessage = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }

      return { success: false, error: errorMessage };
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      console.log('Email sign in successful:', userCredential.user.email);

      return { success: true };
    } catch (error) {
      console.error('Error signing in with email:', error);

      // Handle specific error cases
      let errorMessage = 'Sign in failed. Please check your credentials.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }

      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem('@user');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const value = {
    user,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};