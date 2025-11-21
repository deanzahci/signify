import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Leaderboard categories
export const LEADERBOARD_CATEGORIES = {
  LEVEL_QUIZ: 'levelQuiz',
  LEVEL_SPEED: 'levelSpeed',
  HIGH_SCORE_SPEED: 'highScoreSpeed',
  HIGH_SCORE_QUIZ: 'highScoreQuiz',
  GAMES_PLAYED: 'gamesPlayed'
};

/**
 * Fetches top players for a specific category
 * @param {string} category - The category to fetch (from LEADERBOARD_CATEGORIES)
 * @param {number} limitCount - Number of top players to fetch (default: 10)
 * @returns {Promise<Array>} Array of player objects with rank, name, value, and uid
 */
export const fetchLeaderboard = async (category = LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ, limitCount = 10) => {
  try {
    const usersRef = collection(db, 'users');

    // Create query based on category
    const q = query(
      usersRef,
      orderBy(category, 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);

    const leaderboard = [];
    let rank = 1;

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      leaderboard.push({
        rank: rank++,
        uid: doc.id,
        name: userData.name || userData.email?.split('@')[0] || 'Anonymous',
        email: userData.email,
        value: userData[category] || 0,
        // Include all stats for potential display
        levelQuiz: userData.levelQuiz || 1,
        levelSpeed: userData.levelSpeed || 1,
        highScoreSpeed: userData.highScoreSpeed || 0,
        highScoreQuiz: userData.highScoreQuiz || 0,
        gamesPlayed: userData.gamesPlayed || 0,
        photoURL: userData.photoURL || null
      });
    });

    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

/**
 * Gets the current user's rank in a specific category
 * @param {string} userId - The user's Firebase UID
 * @param {string} category - The category to check rank in
 * @returns {Promise<Object>} Object with user's rank and stats
 */
export const getUserRank = async (userId, category = LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ) => {
  try {
    if (!userId) {
      return null;
    }

    // First, get the user's data
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    const userValue = userData[category] || 0;

    // Count how many users have a higher score
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where(category, '>', userValue)
    );

    const querySnapshot = await getDocs(q);
    const rank = querySnapshot.size + 1;

    return {
      rank,
      name: userData.name || userData.email?.split('@')[0] || 'Anonymous',
      value: userValue,
      levelQuiz: userData.levelQuiz || 1,
      levelSpeed: userData.levelSpeed || 1,
      highScoreSpeed: userData.highScoreSpeed || 0,
      highScoreQuiz: userData.highScoreQuiz || 0,
      gamesPlayed: userData.gamesPlayed || 0,
      photoURL: userData.photoURL || null
    };
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
};

/**
 * Gets complete leaderboard data including top players and current user rank
 * @param {string} userId - The current user's Firebase UID
 * @param {string} category - The category to fetch
 * @param {number} topCount - Number of top players to fetch
 * @returns {Promise<Object>} Object with topPlayers array and userRank object
 */
export const getCompleteLeaderboard = async (userId, category = LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ, topCount = 10) => {
  try {
    const [topPlayers, userRank] = await Promise.all([
      fetchLeaderboard(category, topCount),
      userId ? getUserRank(userId, category) : null
    ]);

    return {
      topPlayers,
      userRank,
      category
    };
  } catch (error) {
    console.error('Error getting complete leaderboard:', error);
    return {
      topPlayers: [],
      userRank: null,
      category
    };
  }
};

/**
 * Formats the value based on the category type
 * @param {string} category - The category
 * @param {number} value - The value to format
 * @returns {string} Formatted value string
 */
export const formatLeaderboardValue = (category, value) => {
  switch (category) {
    case LEADERBOARD_CATEGORIES.LEVEL_QUIZ:
    case LEADERBOARD_CATEGORIES.LEVEL_SPEED:
      return `Level ${value}`;
    case LEADERBOARD_CATEGORIES.HIGH_SCORE_SPEED:
    case LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ:
      return `${value.toLocaleString()} pts`;
    case LEADERBOARD_CATEGORIES.GAMES_PLAYED:
      return `${value} ${value === 1 ? 'game' : 'games'}`;
    default:
      return value.toString();
  }
};

/**
 * Gets the display title for a category
 * @param {string} category - The category
 * @returns {string} Display title
 */
export const getCategoryTitle = (category) => {
  switch (category) {
    case LEADERBOARD_CATEGORIES.LEVEL_QUIZ:
      return 'Quiz Level';
    case LEADERBOARD_CATEGORIES.LEVEL_SPEED:
      return 'Speed Level';
    case LEADERBOARD_CATEGORIES.HIGH_SCORE_SPEED:
      return 'Speed High Score';
    case LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ:
      return 'Quiz High Score';
    case LEADERBOARD_CATEGORIES.GAMES_PLAYED:
      return 'Games Played';
    default:
      return 'Leaderboard';
  }
};

/**
 * Gets the tab title for a category (shorter version)
 * @param {string} category - The category
 * @returns {string} Tab title
 */
export const getCategoryTabTitle = (category) => {
  switch (category) {
    case LEADERBOARD_CATEGORIES.LEVEL_QUIZ:
      return 'QUIZ LVL';
    case LEADERBOARD_CATEGORIES.LEVEL_SPEED:
      return 'SPEED LVL';
    case LEADERBOARD_CATEGORIES.HIGH_SCORE_SPEED:
      return 'SPEED';
    case LEADERBOARD_CATEGORIES.HIGH_SCORE_QUIZ:
      return 'QUIZ';
    case LEADERBOARD_CATEGORIES.GAMES_PLAYED:
      return 'GAMES';
    default:
      return 'ALL';
  }
};