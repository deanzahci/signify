import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import {
  LEADERBOARD_CATEGORIES,
  getCompleteLeaderboard,
  formatLeaderboardValue
} from '../services/leaderboardService';

const LeaderboardScreen = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ);
  const [leaderboardData, setLeaderboardData] = useState({
    topPlayers: [],
    userRank: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Categories for tabs - keeping it simple with 3 main categories
  const categories = [
    { key: LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ, label: 'QUIZ' },
    { key: LEADERBOARD_CATEGORIES.HIGH_SCORE_SPEED, label: 'SPEED' },
    { key: LEADERBOARD_CATEGORIES.GAMES_PLAYED, label: 'GAMES' }
  ];

  // Fetch leaderboard data
  const fetchData = async () => {
    try {
      const data = await getCompleteLeaderboard(user?.id, selectedCategory, 10);
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data when category changes
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedCategory]);

  // Reload data when screen comes into focus (handles new user registration)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchData();
      }
    }, [user, selectedCategory])
  );

  // Pull to refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Tab component
  const TabButton = ({ category, isActive }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={() => setSelectedCategory(category.key)}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {category.label}
      </Text>
    </TouchableOpacity>
  );

  // Player card component
  const PlayerCard = ({ player, isCurrentUser }) => {
    const isTop3 = player.rank <= 3;

    // Determine trophy color based on rank
    const getTrophyColor = (rank) => {
      switch(rank) {
        case 1: return '#FFB800'; // Darker gold for better contrast
        case 2: return '#808080'; // Darker silver for better contrast
        case 3: return '#CD7F32'; // Bronze
        default: return colors.brutalBlack;
      }
    };

    // Get background style based on rank
    const getRankStyle = (rank) => {
      switch(rank) {
        case 1: return styles.goldCard;
        case 2: return styles.silverCard;
        case 3: return styles.bronzeCard;
        default: return null;
      }
    };

    return (
      <View
        style={[
          styles.playerCard,
          isTop3 && getRankStyle(player.rank),
          isCurrentUser && styles.currentUserCard
        ]}
      >
        <View style={styles.playerRow}>
          <View style={styles.playerInfo}>
            <Text style={styles.rankText}>
              {player.rank}
            </Text>
            {/* Profile Picture */}
            <View style={styles.profilePictureContainer}>
              {player.photoURL ? (
                <Image
                  source={{ uri: player.photoURL }}
                  style={styles.profilePicture}
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Ionicons
                    name="person"
                    size={24}
                    color={colors.brutalBlack}
                  />
                </View>
              )}
            </View>
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>
                {player.name}
                {isCurrentUser && ' (You)'}
              </Text>
              <Text style={styles.playerScore}>
                {formatLeaderboardValue(selectedCategory, player.value)}
              </Text>
            </View>
          </View>
          {isTop3 && (
            <View style={styles.trophyContainer}>
              <Ionicons
                name="trophy"
                size={24}
                color={getTrophyColor(player.rank)}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>LEADERBOARD</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <View style={styles.tabContent}>
          {categories.map(category => (
            <TabButton
              key={category.key}
              category={category}
              isActive={selectedCategory === category.key}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brutalBlue]}
            tintColor={colors.brutalBlue}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brutalBlue} />
          </View>
        ) : (
          <>
            {/* Top Players */}
            {leaderboardData.topPlayers.length > 0 ? (
              <View>
                {leaderboardData.topPlayers.map((player) => (
                  <PlayerCard
                    key={player.uid}
                    player={player}
                    isCurrentUser={player.uid === user?.id}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No players yet. Be the first!
                </Text>
              </View>
            )}

            {/* Your Rank Card */}
            {user && leaderboardData.userRank &&
             !leaderboardData.topPlayers.some(p => p.uid === user.id) && (
              <View style={styles.yourRankCard}>
                <Text style={styles.yourRankTitle}>
                  YOUR RANKING
                </Text>
                <View style={styles.yourRankRow}>
                  <Text style={styles.yourRankLabel}>Position:</Text>
                  <Text style={styles.yourRankValue}>
                    #{leaderboardData.userRank.rank}
                  </Text>
                </View>
                <View style={styles.yourRankRow}>
                  <Text style={styles.yourRankLabel}>Score:</Text>
                  <Text style={styles.yourRankValue}>
                    {formatLeaderboardValue(selectedCategory, leaderboardData.userRank.value)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.brutalBlack,
    fontFamily: 'Arial',
  },
  tabContainer: {
    borderBottomWidth: 3,
    borderBottomColor: colors.brutalBlack,
  },
  tabContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: colors.brutalBlue,
    transform: [{ translateY: 2 }],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brutalBlack,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.brutalWhite,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 100, // Add extra padding to prevent cutoff
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
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
  goldCard: {
    backgroundColor: '#FFF3CD', // Lighter gold background
  },
  silverCard: {
    backgroundColor: '#F0F0F0', // Lighter silver background
  },
  bronzeCard: {
    backgroundColor: '#F5DEB3', // Lighter bronze background (wheat)
  },
  currentUserCard: {
    borderColor: colors.brutalBlue,
    borderWidth: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.brutalBlack,
    width: 48,
    fontFamily: 'monospace',
  },
  playerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  profilePictureContainer: {
    marginLeft: 12,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
  },
  profilePicturePlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: colors.brutalGray,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brutalBlack,
  },
  playerScore: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.brutalBlack,
    marginTop: 4,
  },
  trophyContainer: {
    marginLeft: 8,
    paddingRight: 4,
    minWidth: 32,
    alignItems: 'center',
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
    fontWeight: '900',
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
    fontSize: 14,
  },
  yourRankValue: {
    color: colors.brutalWhite,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.brutalBlack,
    fontFamily: 'monospace',
  },
});

export default LeaderboardScreen;