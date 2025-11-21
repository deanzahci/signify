import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

const LeaderboardScreen = () => {
  // Mock data for leaderboard
  const leaderboardData = [
    { rank: 1, name: 'Player One', score: 2500 },
    { rank: 2, name: 'Player Two', score: 2350 },
    { rank: 3, name: 'Player Three', score: 2200 },
    { rank: 4, name: 'Player Four', score: 2100 },
    { rank: 5, name: 'Player Five', score: 2000 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>LEADERBOARD</Text>
          <Text style={styles.subtitle}>
            Top players this week
          </Text>
        </View>

        {/* Leaderboard List */}
        <View>
          {leaderboardData.map((player) => (
            <View
              key={player.rank}
              style={[
                styles.playerCard,
                player.rank <= 3 && styles.topPlayerCard,
              ]}
            >
              <View style={styles.playerRow}>
                <View style={styles.playerInfo}>
                  <Text style={styles.rankText}>
                    {player.rank}
                  </Text>
                  <View style={styles.playerDetails}>
                    <Text style={styles.playerName}>
                      {player.name}
                    </Text>
                    <Text style={styles.playerScore}>
                      {player.score.toLocaleString()} pts
                    </Text>
                  </View>
                </View>
                {player.rank <= 3 && (
                  <Ionicons name="trophy" size={24} color={colors.brutalBlack} />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Your Rank Card */}
        <View style={styles.yourRankCard}>
          <Text style={styles.yourRankTitle}>
            YOUR RANKING
          </Text>
          <View style={styles.yourRankRow}>
            <Text style={styles.yourRankLabel}>Position:</Text>
            <Text style={styles.yourRankValue}>#42</Text>
          </View>
          <View style={styles.yourRankRow}>
            <Text style={styles.yourRankLabel}>Score:</Text>
            <Text style={styles.yourRankValue}>850 pts</Text>
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
  playerCard: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  topPlayerCard: {
    backgroundColor: colors.brutalYellow,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    width: 48,
  },
  playerDetails: {
    marginLeft: 16,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  playerScore: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.brutalBlack,
  },
  yourRankCard: {
    backgroundColor: colors.brutalBlue,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    padding: 16,
    marginTop: 32,
    marginBottom: 16,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  yourRankTitle: {
    color: colors.brutalWhite,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  yourRankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  yourRankLabel: {
    color: colors.brutalWhite,
    fontFamily: 'monospace',
  },
  yourRankValue: {
    color: colors.brutalWhite,
    fontWeight: 'bold',
  },
});

export default LeaderboardScreen;