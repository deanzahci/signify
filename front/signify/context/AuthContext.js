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
        // Initialize letter statistics for all 26 letters
        const letterStats = {};
        for (let i = 65; i <= 90; i++) {
          const letter = String.fromCharCode(i);
          letterStats[letter] = { attempts: 0, skips: 0, successes: 0 };
        }

        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),

          levelSpeed: 1,
          levelQuiz:1,
          highScoreSpeed:0,
          highScoreQuiz:0,
          gamesPlayed: 0,

          // Struggle tracking system
          struggleLetters: {
            high: [],     // Letters with >70% skip rate
            medium: [],   // Letters with 40-70% skip rate
            low: []       // Letters with <40% skip rate
          },
          letterStats: letterStats,
          lastStatsUpdate: serverTimestamp()

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
      console.log('Starting sign out process...');

      // Sign out from Firebase
      await firebaseSignOut(auth);
      console.log('Firebase sign out successful');

      // Clear local storage
      await AsyncStorage.removeItem('@user');
      console.log('Local storage cleared');

      // Clear user state
      setUser(null);
      console.log('User state cleared');

      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      throw error; // Re-throw to let the caller handle it
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