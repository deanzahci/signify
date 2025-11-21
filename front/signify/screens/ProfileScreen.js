import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PROFILE</Text>
          <Text style={styles.subtitle}>
            Your account details
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageWrapper}>
              {user?.picture ? (
                <View style={styles.profileImageContainer}>
                  <Image
                    source={{ uri: user.picture }}
                    style={styles.profileImage}
                  />
                </View>
              ) : (
                <View style={styles.profileIconContainer}>
                  <Ionicons name="person" size={40} color={colors.brutalWhite} />
                </View>
              )}
              {/* Show Google badge if signed in with Google */}
              {user?.picture && (
                <View style={styles.googleBadge}>
                  <Ionicons name="logo-google" size={16} color={colors.brutalWhite} />
                </View>
              )}
            </View>
            <Text style={styles.profileName}>
              {user?.name || 'Guest User'}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email || 'Not signed in'}
            </Text>
          </View>

          {/* User Stats */}
          <View style={styles.divider} />
          <View style={styles.statsSection}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Member Since:</Text>
              <Text style={styles.statValue}>Nov 2024</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Points:</Text>
              <Text style={styles.statValue}>850</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Level:</Text>
              <Text style={styles.statValue}>Beginner</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>SETTINGS</Text>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="notifications" size={20} color={colors.brutalBlack} />
              <Text style={styles.settingsItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brutalBlack} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield" size={20} color={colors.brutalBlack} />
              <Text style={styles.settingsItemText}>Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brutalBlack} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, styles.lastSettingsItem]}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="help-circle" size={20} color={colors.brutalBlack} />
              <Text style={styles.settingsItemText}>Help</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brutalBlack} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutButton}
          activeOpacity={0.9}
        >
          <Ionicons name="log-out" size={20} color={colors.brutalWhite} />
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'monospace',
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
    borderRadius: 48,
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
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  googleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.brutalRed,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    borderRadius: 14,
    width: 28,
    height: 28,
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
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'monospace',
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
    fontFamily: 'monospace',
    color: colors.brutalBlack,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontFamily: 'monospace',
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
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProfileScreen;