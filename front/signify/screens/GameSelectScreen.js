import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/colors';

const GameSelectScreen = ({ onSelectMode, userStats = {} }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>GAME ZONE</Text>
          <Text style={styles.subtitle}>
            Choose your challenge and start playing!
          </Text>
        </View>

        {/* Quiz Mode Card */}
        <TouchableOpacity
          style={[styles.modeCard, { backgroundColor: colors.brutalBlue }]}
          activeOpacity={0.9}
          onPress={() => onSelectMode('quizPreview')}
        >
          <View style={styles.modeIcon}>
            <Text style={styles.modeIconText}>❓</Text>
          </View>
          <Text style={styles.modeTitle}>QUIZ MODE</Text>
          <Text style={styles.modeDescription}>
            Guess the word from a hint! Sign using ASL to spell your answer letter by letter.
          </Text>
        </TouchableOpacity>

        {/* SignSpeed Card */}
        <TouchableOpacity
          style={[styles.modeCard, { backgroundColor: colors.brutalGreen }]}
          activeOpacity={0.9}
          onPress={() => onSelectMode('speedPreview')}
        >
          <View style={styles.modeIcon}>
            <Text style={styles.modeIconText}>⚡</Text>
          </View>
          <Text style={styles.modeTitle}>SIGNSPEED</Text>
          <Text style={styles.modeDescription}>
            Race against time! Sign words as fast as you can. Beat the 30-second timer and maximize your score.
          </Text>
        </TouchableOpacity>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>YOUR STATS</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Quiz High Score:</Text>
            <Text style={styles.statValue}>{userStats.quizHighScore || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Best WPM:</Text>
            <Text style={styles.statValue}>{userStats.bestWPM || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Games Played:</Text>
            <Text style={styles.statValue}>{userStats.gamesPlayed || 0}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.brutalBlack,
    marginTop: 8,
  },

  // Mode Cards
  modeCard: {
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  modeIcon: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  modeIconText: {
    fontSize: 48,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    marginBottom: 12,
    letterSpacing: 1,
  },
  modeDescription: {
    fontSize: 14,
    color: colors.brutalWhite,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Stats Card
  statsCard: {
    backgroundColor: colors.brutalGray,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 16,
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
});

export default GameSelectScreen;