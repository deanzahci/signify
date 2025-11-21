import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/colors';

const GameScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>GAME</Text>
          <Text style={styles.subtitle}>
            Start playing and earn points
          </Text>
        </View>

        {/* Game Card */}
        <View style={styles.gameCard}>
          <Text style={styles.gameCardTitle}>
            READY TO PLAY?
          </Text>
          <Text style={styles.gameCardText}>
            Tap the button below to start a new game session.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>
              START GAME
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>
            Your Stats
          </Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Games Played:</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>High Score:</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Current Streak:</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>
      </View>
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
  gameCard: {
    backgroundColor: colors.brutalBlue,
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
  gameCardTitle: {
    color: colors.brutalWhite,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  gameCardText: {
    color: colors.brutalWhite,
    fontSize: 16,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  startButtonText: {
    color: colors.brutalBlack,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    padding: 16,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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

export default GameScreen;