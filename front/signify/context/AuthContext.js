import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configure Google OAuth
  // You'll need to add your Google OAuth client IDs here
  const [request, response, promptAsync] = Google.useAuthRequest({
    // For Expo Go, use the proxy service
    expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
    // For standalone apps
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    // For web
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    // Check if user is already logged in
    checkAuthState();
  }, []);

  useEffect(() => {
    handleGoogleSignInResponse();
  }, [response]);

  const checkAuthState = async () => {
    try {
      const userJson = await AsyncStorage.getItem('@user');
      if (userJson) {
        setUser(JSON.parse(userJson));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInResponse = async () => {
    if (response?.type === 'success') {
      const { authentication } = response;

      // Fetch user info from Google
      try {
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${authentication.accessToken}`,
            },
          }
        );

        const userInfo = await userInfoResponse.json();

        const userData = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: authentication.accessToken,
          authenticated: true,
        };

        // Save user data
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
        setUser(userData);

      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();
      return result;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@user');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};