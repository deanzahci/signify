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
import { useTheme } from '../context/ThemeContext';
import { useThemedColors, useThemedShadow } from '../hooks/useThemedColors';
import { useFocusEffect } from '@react-navigation/native';
import {
  LEADERBOARD_CATEGORIES,
  getCompleteLeaderboard,
  formatLeaderboardValue
} from '../services/leaderboardService';
import { NBIcon } from '../components/NeoBrutalistIcons';

const LeaderboardScreen = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const themedColors = useThemedColors();
  const shadowStyle = useThemedShadow('medium');
  const [selectedCategory, setSelectedCategory] = useState(LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ);
  const [leaderboardData, setLeaderboardData] = useState({
    topPlayers: [],
    userRank: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  // Tab component without animations
  const TabButton = ({ category, isActive, index }) => {
    const handlePress = () => {
      setSelectedCategory(category.key);
      setSelectedIndex(index);
    };

    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          {
            backgroundColor: isActive ? themedColors.brutalBlue : themedColors.brutalWhite,
            borderColor: themedColors.brutalBlack,
          },
          isActive && styles.activeTabButton
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabText,
          {
            color: isActive ?
              (isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite) :
              themedColors.brutalBlack
          }
        ]}>
          {category.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Player card component without animations
  const PlayerCard = ({ player, isCurrentUser }) => {
    const isTop3 = player.rank <= 3;

    // Determine trophy color based on rank
    const getTrophyColor = (rank) => {
      switch(rank) {
        case 1: return isDarkMode ? '#FFD700' : '#FFB800';
        case 2: return isDarkMode ? '#C0C0C0' : '#808080';
        case 3: return '#CD7F32'; // Bronze
        default: return themedColors.brutalBlack;
      }
    };

    // Get background style based on rank
    const getRankStyle = (rank) => {
      switch(rank) {
        case 1: return { backgroundColor: isDarkMode ? '#8B7500' : '#FFF3CD' };
        case 2: return { backgroundColor: isDarkMode ? '#4A4A4A' : '#F0F0F0' };
        case 3: return { backgroundColor: isDarkMode ? '#6B4423' : '#F5DEB3' };
        default: return null;
      }
    };

    return (
      <View
        style={[
          styles.playerCard,
          {
            backgroundColor: themedColors.brutalWhite,
            borderColor: themedColors.brutalBlack,
            ...shadowStyle,
          },
          isTop3 && getRankStyle(player.rank),
          isCurrentUser && { borderColor: themedColors.brutalBlue, borderWidth: 4 },
        ]}
      >
        <View style={styles.playerRow}>
          <View style={styles.playerInfo}>
            <Text style={[styles.rankText, { color: themedColors.brutalBlack }]}>
              {player.rank}
            </Text>
            {/* Profile Picture */}
            <View style={styles.profilePictureContainer}>
              {player.photoURL ? (
                <Image
                  source={{ uri: player.photoURL }}
                  style={[styles.profilePicture, { borderColor: themedColors.brutalBlack }]}
                />
              ) : (
                <View style={[
                  styles.profilePicturePlaceholder,
                  {
                    backgroundColor: themedColors.brutalGray,
                    borderColor: themedColors.brutalBlack
                  }
                ]}>
                  <Ionicons
                    name="person"
                    size={24}
                    color={themedColors.brutalBlack}
                  />
                </View>
              )}
            </View>
            <View style={styles.playerDetails}>
              <Text style={[styles.playerName, { color: themedColors.brutalBlack }]}>
                {player.name}
                {isCurrentUser && ' (You)'}
              </Text>
              <Text style={[styles.playerScore, { color: themedColors.brutalBlack }]}>
                {formatLeaderboardValue(selectedCategory, player.value)}
              </Text>
            </View>
          </View>
          {isTop3 && (
            <View style={styles.trophyContainer}>
              <NBIcon
                name="Trophy"
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
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: themedColors.brutalWhite }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[themedColors.brutalBlue]}
          tintColor={themedColors.brutalBlue}
        />
      }
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <NBIcon name="Trophy" size={32} color={themedColors.brutalBlack} />
            <Text style={[styles.title, { color: themedColors.brutalBlack }]}>LEADERBOARD</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { borderBottomColor: themedColors.brutalBlack }]}>
          <View style={styles.tabContent}>
            {categories.map((category, index) => (
              <TabButton
                key={category.key}
                category={category}
                isActive={selectedCategory === category.key}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themedColors.brutalBlue} />
            </View>
          ) : (
            <>
              {/* Top Players */}
              {leaderboardData.topPlayers.length > 0 ? (
                <View>
                  {leaderboardData.topPlayers.map((player, index) => (
                    <PlayerCard
                      key={player.uid}
                      player={player}
                      isCurrentUser={player.uid === user?.id}
                      index={index}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <NBIcon name="Target" size={48} color={themedColors.brutalGray} />
                  <Text style={[styles.emptyStateText, { color: themedColors.brutalBlack }]}>
                    No players yet. Be the first!
                  </Text>
                </View>
              )}

              {/* Your Rank Card */}
              {user && leaderboardData.userRank &&
               !leaderboardData.topPlayers.some(p => p.uid === user.id) && (
                <View style={[
                  styles.yourRankCard,
                  {
                    backgroundColor: themedColors.brutalBlue,
                    borderColor: themedColors.brutalBlack,
                    ...shadowStyle,
                  }
                ]}>
                  <Text style={[
                    styles.yourRankTitle,
                    { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }
                  ]}>
                    YOUR RANKING
                  </Text>
                  <View style={styles.yourRankRow}>
                    <Text style={[
                      styles.yourRankLabel,
                      { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }
                    ]}>Position:</Text>
                    <Text style={[
                      styles.yourRankValue,
                      { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }
                    ]}>
                      #{leaderboardData.userRank.rank}
                    </Text>
                  </View>
                  <View style={styles.yourRankRow}>
                    <Text style={[
                      styles.yourRankLabel,
                      { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }
                    ]}>Score:</Text>
                    <Text style={[
                      styles.yourRankValue,
                      { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }
                    ]}>
                      {formatLeaderboardValue(selectedCategory, leaderboardData.userRank.value)}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Sora-ExtraBold',
  },
  tabContainer: {
    borderBottomWidth: 3,
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.brutalWhite,
  },
  content: {
    padding: 24,
    paddingBottom: 100, // Add extra padding for tab bar
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
    fontFamily: 'Sora-ExtraBold',
    color: colors.brutalBlack,
    width: 48,
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  playerScore: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
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
    fontFamily: 'Sora-ExtraBold',
    marginBottom: 8,
  },
  yourRankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  yourRankLabel: {
    color: colors.brutalWhite,
    fontFamily: 'Sora-Regular',
    fontSize: 14,
  },
  yourRankValue: {
    color: colors.brutalWhite,
    fontFamily: 'Sora-Bold',
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.brutalBlack,
    fontFamily: 'Sora-Regular',
  },
});

export default LeaderboardScreen;