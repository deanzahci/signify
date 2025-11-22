import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../styles/colors';
import { useThemedColors, useThemedShadow } from '../hooks/useThemedColors';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatLeaderboardValue } from '../services/leaderboardService';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const { isDarkMode, themeMode, toggleTheme } = useTheme();
  const themedColors = useThemedColors();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch user data from Firebase
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Handle profile picture update
  const handleEditProfilePicture = async () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Take photo with camera
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadProfilePicture(result.assets[0].uri);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Gallery permission is required to select photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadProfilePicture(result.assets[0].uri);
    }
  };

  // Upload profile picture to Firebase Storage
  const uploadProfilePicture = async (imageUri) => {
    if (!user?.id) return;

    setUploadingImage(true);
    try {
      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `profilePictures/${user.id}_${Date.now()}.jpg`);
      const snapshot = await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        photoURL: downloadURL
      });

      // Update local state
      setUserData(prev => ({ ...prev, photoURL: downloadURL }));

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ],
      { cancelable: true }
    );
  };

  // Get theme icon based on current mode
  const getThemeIcon = () => {
    if (themeMode === 'light') return 'sunny';
    if (themeMode === 'dark') return 'moon';
    return 'phone-portrait-outline'; // system
  };

  // Get theme label based on current mode
  const getThemeLabel = () => {
    if (themeMode === 'light') return 'LIGHT';
    if (themeMode === 'dark') return 'DARK';
    return 'SYSTEM';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brutalBlue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && { backgroundColor: themedColors.brutalBackground }]}>
      <ScrollView style={[styles.content, isDarkMode && { backgroundColor: themedColors.brutalBackground }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && { color: themedColors.brutalText }]}>PROFILE</Text>
          <Text style={[styles.subtitle, isDarkMode && { color: themedColors.brutalTextSecondary }]}>
            Your account details
          </Text>
        </View>

        {/* Profile Card */}
        <View style={[
          styles.profileCard,
          isDarkMode && {
            backgroundColor: themedColors.brutalSurface,
            borderColor: themedColors.brutalBorder,
            shadowColor: themedColors.brutalShadow,
          }
        ]}>
          <View style={styles.profileHeader}>
            <TouchableOpacity
              onPress={handleEditProfilePicture}
              disabled={uploadingImage}
              style={styles.profileImageWrapper}
            >
              {uploadingImage ? (
                <View style={styles.profileIconContainer}>
                  <ActivityIndicator size="large" color={colors.brutalWhite} />
                </View>
              ) : userData?.photoURL || user?.picture ? (
                <View style={[
                  styles.profileImageContainer,
                  isDarkMode && {
                    borderColor: themedColors.brutalBorder,
                    shadowColor: themedColors.brutalShadow,
                  }
                ]}>
                  <Image
                    source={{ uri: userData?.photoURL || user?.picture }}
                    style={styles.profileImage}
                  />
                  <View style={[
                    styles.editBadge,
                    isDarkMode && {
                      backgroundColor: themedColors.brutalBlue,
                      borderColor: themedColors.brutalBorder,
                    }
                  ]}>
                    <Ionicons name="camera" size={16} color={colors.brutalWhite} />
                  </View>
                </View>
              ) : (
                <View style={[
                  styles.profileIconContainer,
                  isDarkMode && {
                    backgroundColor: themedColors.brutalBlue,
                    borderColor: themedColors.brutalBorder,
                    shadowColor: themedColors.brutalShadow,
                  }
                ]}>
                  <Ionicons name="person" size={40} color={colors.brutalWhite} />
                  <View style={[
                    styles.editBadge,
                    isDarkMode && {
                      backgroundColor: themedColors.brutalPurple,
                      borderColor: themedColors.brutalBorder,
                    }
                  ]}>
                    <Ionicons name="camera" size={16} color={colors.brutalWhite} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.profileName, isDarkMode && { color: themedColors.brutalText }]}>
              {userData?.name || user?.name || 'Guest User'}
            </Text>
            <Text style={[styles.profileEmail, isDarkMode && { color: themedColors.brutalTextSecondary }]}>
              {userData?.email || user?.email || 'Not signed in'}
            </Text>
          </View>

          {/* User Stats */}
          <View style={[styles.divider, isDarkMode && { backgroundColor: themedColors.brutalBorder }]} />
          <View style={styles.statsSection}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, isDarkMode && { color: themedColors.brutalTextSecondary }]}>Member Since:</Text>
              <Text style={[styles.statValue, isDarkMode && { color: themedColors.brutalText }]}>
                {formatDate(userData?.createdAt)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, isDarkMode && { color: themedColors.brutalTextSecondary }]}>Quiz Highscore:</Text>
              <Text style={[styles.statValue, isDarkMode && { color: themedColors.brutalText }]}>
                {formatLeaderboardValue('highScoreQuiz', userData?.highScoreQuiz || 0)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, isDarkMode && { color: themedColors.brutalTextSecondary }]}>Speed Highscore:</Text>
              <Text style={[styles.statValue, isDarkMode && { color: themedColors.brutalText }]}>
                {formatLeaderboardValue('highScoreSpeed', userData?.highScoreSpeed || 0)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={[styles.statLabel, isDarkMode && { color: themedColors.brutalTextSecondary }]}>Games Played:</Text>
              <Text style={[styles.statValue, isDarkMode && { color: themedColors.brutalText }]}>
                {userData?.gamesPlayed || 0} games
              </Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={[
          styles.settingsCard,
          isDarkMode && {
            backgroundColor: themedColors.brutalSurface,
            borderColor: themedColors.brutalBorder,
            shadowColor: themedColors.brutalShadow,
          }
        ]}>
          <Text style={[styles.settingsTitle, isDarkMode && { color: themedColors.brutalText }]}>SETTINGS</Text>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => Alert.alert('We collect all your data')}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield" size={20} color={isDarkMode ? themedColors.brutalText : colors.brutalBlack} />
              <Text style={[styles.settingsItemText, isDarkMode && { color: themedColors.brutalText }]}>Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.brutalTextSecondary : colors.brutalBlack} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsItem, styles.lastSettingsItem]}
            onPress={() => Alert.alert('Help:', "Good luck")}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="help-circle" size={20} color={isDarkMode ? themedColors.brutalText : colors.brutalBlack} />
              <Text style={[styles.settingsItemText, isDarkMode && { color: themedColors.brutalText }]}>Help</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.brutalTextSecondary : colors.brutalBlack} />
          </TouchableOpacity>
        </View>

        {/* Theme Settings */}
        <View style={[
          styles.settingsCard,
          isDarkMode && {
            backgroundColor: themedColors.brutalSurface,
            borderColor: themedColors.brutalBorder,
            shadowColor: themedColors.brutalShadow,
          }
        ]}>
          <Text style={[styles.settingsTitle, isDarkMode && { color: themedColors.brutalText }]}>APPEARANCE</Text>

          <TouchableOpacity
            style={[styles.settingsItem, styles.lastSettingsItem]}
            onPress={toggleTheme}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons
                name={getThemeIcon()}
                size={20}
                color={isDarkMode ? themedColors.brutalText : colors.brutalBlack}
              />
              <Text style={[
                styles.settingsItemText,
                isDarkMode && { color: themedColors.brutalText }
              ]}>
                Theme
              </Text>
            </View>
            <View style={[
              styles.themeBadge,
              isDarkMode && {
                backgroundColor: themedColors.brutalBlue,
                borderColor: themedColors.brutalBorder,
                shadowColor: themedColors.brutalShadow,
              }
            ]}>
              <Text style={styles.themeBadgeText}>
                {getThemeLabel()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[
            styles.signOutButton,
            isDarkMode && {
              backgroundColor: themedColors.brutalRed,
              borderColor: themedColors.brutalBorder,
              shadowColor: themedColors.brutalShadow,
            }
          ]}
          activeOpacity={0.9}
        >
          <Ionicons name="log-out" size={20} color={isDarkMode ? colors.dark.brutalWhite : colors.brutalWhite} />
          <Text style={styles.signOutButtonText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
    marginTop: 8,
  },
  profileCard: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    padding: 24,
    marginBottom: 24,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImageContainer: {
    width: 96,
    height: 96,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    overflow: 'hidden',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    backgroundColor: colors.brutalWhite,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: colors.brutalBlue,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.brutalGreen,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
    marginTop: 4,
  },
  divider: {
    height: 2,
    backgroundColor: colors.brutalBlack,
    marginBottom: 16,
  },
  statsSection: {
    paddingTop: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  settingsCard: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    padding: 16,
    marginBottom: 24,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  settingsTitle: {
    fontSize: 18,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    marginBottom: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.brutalGray,
  },
  lastSettingsItem: {
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
  },
  signOutButton: {
    backgroundColor: colors.brutalRed,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  signOutButtonText: {
    color: colors.brutalWhite,
    fontFamily: 'Sora-Bold',
    marginLeft: 8,
  },
  themeBadge: {
    backgroundColor: colors.brutalBlue,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  themeBadgeText: {
    color: colors.brutalWhite,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});

export default ProfileScreen;