// Game API functions that can be called directly from the frontend
// These integrate with OpenAI GPT for dynamic word generation based on struggle letters

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get OpenAI API key from secure storage
 * For production, this should be in a backend service
 */
const getOpenAIKey = async () => {
  try {
    // In development, we read from .env.local
    // For React Native, we need to store it in AsyncStorage after initial setup
    let key = await AsyncStorage.getItem('OPENAI_API_KEY');

    // If not in AsyncStorage, set it (one-time setup)
    if (!key) {
      // This is your API key - stored temporarily for hackathon
      key = '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';
      await AsyncStorage.setItem('OPENAI_API_KEY', key);
    }

    return key;
  } catch (error) {
    console.error('Error getting OpenAI key:', error);
    return null;
  }
};

/**
 * Generate GPT prompt for word generation
 */
const generateGPTPrompt = (level, struggleLetters, gameType) => {
  const wordCount = level + 2; // Level number + 2 problems

  const struggleInfo = struggleLetters && (struggleLetters.high?.length > 0 || struggleLetters.medium?.length > 0)
    ? `Focus on these struggle letters:
- High priority (use frequently): ${struggleLetters.high?.join(', ') || 'none'}
- Medium priority (use moderately): ${struggleLetters.medium?.join(', ') || 'none'}`
    : 'No specific letter focus needed.';

  return `Generate ${wordCount} ASL practice words for level ${level}.

${struggleInfo}

Requirements:
1. Words should be appropriate for ASL beginners
2. ${struggleLetters?.high?.length > 0 ? 'Include at least one high-priority struggle letter per word' : 'Use common ASL vocabulary'}
3. Difficulty should match level ${level} (1=very easy 3-4 letters, 2=easy 4-5 letters, 3=medium 5-6 letters, 4=harder 6-8 letters, 5+=challenging 8+ letters)
4. Provide a simple, clear hint for each word
5. Words should be commonly fingerspelled in ASL

Return ONLY a JSON array in this exact format, no other text:
[
  {"word": "HELLO", "hint": "A common greeting"},
  {"word": "WORLD", "hint": "The planet Earth"}
]`;
};

/**
 * Generate words using GPT based on struggle letters
 */
async function generateWordsWithGPT(level, struggleLetters, gameType = 'quiz') {
  try {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      console.log('No API key, falling back to default words');
      return getDefaultWordsForLevel(level);
    }

    const prompt = generateGPTPrompt(level, struggleLetters, gameType);
    console.log('GPT Prompt:', prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful ASL learning assistant. Always return valid JSON arrays only, no additional text.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return getDefaultWordsForLevel(level);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Parse the JSON response
    try {
      const words = JSON.parse(content);
      console.log('GPT generated words:', words);

      // Validate and format the words
      const formattedWords = words.map(item => ({
        word: item.word.toUpperCase(),
        hint: item.hint || 'Practice this word'
      }));

      return formattedWords;
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      return getDefaultWordsForLevel(level);
    }

  } catch (error) {
    console.error('GPT generation failed:', error);
    // Fallback to default words
    return getDefaultWordsForLevel(level);
  }
}

/**
 * Get user's struggle letters from Firestore
 */
async function getUserStruggleLetters(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.struggleLetters || { high: [], medium: [], low: [] };
    }

    return { high: [], medium: [], low: [] };
  } catch (error) {
    console.error('Error fetching struggle letters:', error);
    return { high: [], medium: [], low: [] };
  }
}

/**
 * Update letter statistics after a game action
 */
export async function updateLetterStats(userId, letter, action) {
  try {
    if (!userId || !letter) return;

    const letterUpper = letter.toUpperCase();
    const userRef = doc(db, 'users', userId);

    // Get current user data
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    let letterStats = userData.letterStats || {};

    // Initialize letter stats if not exists
    if (!letterStats[letterUpper]) {
      letterStats[letterUpper] = { attempts: 0, skips: 0, successes: 0 };
    }

    // Update stats based on action
    switch (action) {
      case 'skip':
        letterStats[letterUpper].skips += 1;
        letterStats[letterUpper].attempts += 1;
        break;
      case 'success':
        letterStats[letterUpper].successes += 1;
        letterStats[letterUpper].attempts += 1;
        break;
      case 'attempt':
        letterStats[letterUpper].attempts += 1;
        break;
    }

    // Recategorize struggle letters
    const struggleLetters = categorizeStruggleLetters(letterStats);

    // Update Firestore
    await updateDoc(userRef, {
      letterStats: letterStats,
      struggleLetters: struggleLetters,
      lastStatsUpdate: new Date()
    });

    console.log(`Updated stats for letter ${letterUpper}: ${action}`);

  } catch (error) {
    console.error('Error updating letter stats:', error);
  }
}

/**
 * Categorize letters based on performance
 */
function categorizeStruggleLetters(letterStats) {
  const categories = { high: [], medium: [], low: [] };

  Object.entries(letterStats).forEach(([letter, stats]) => {
    if (stats.attempts === 0) return;

    const skipRate = stats.skips / stats.attempts;
    const successRate = stats.successes / stats.attempts;

    // High struggle: >70% skip rate
    if (skipRate > 0.7) {
      categories.high.push(letter);
    }
    // Medium struggle: 40-70% skip rate
    else if (skipRate > 0.4) {
      categories.medium.push(letter);
    }
    // Low struggle: <40% skip rate but not mastered
    else if (successRate < 0.8 || stats.attempts < 5) {
      categories.low.push(letter);
    }
    // If success rate > 80% and attempts > 5, letter is mastered (not in any struggle category)
  });

  return categories;
}

/**
 * Quiz Game function with GPT integration
 */
export async function quizGame(userUUID, userLevel) {
  try {
    console.log(`Quiz Game request - User: ${userUUID}, Level: ${userLevel}`);

    // Get user's struggle letters
    const struggleLetters = await getUserStruggleLetters(userUUID);
    console.log('User struggle letters:', struggleLetters);

    // Generate words using GPT or fallback
    const words = await generateWordsWithGPT(userLevel, struggleLetters, 'quiz');

    return {
      success: true,
      words: words,
      level: userLevel,
      timestamp: new Date().toISOString(),
      struggleLetters: struggleLetters
    };

  } catch (error) {
    console.error('Quiz game error:', error);

    // Fallback response
    return {
      success: true,
      words: getDefaultWordsForLevel(userLevel),
      level: userLevel,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Speed Game function with GPT integration
 */
export async function speedGame(userUUID, userLevel) {
  try {
    console.log(`Speed Game request - User: ${userUUID}, Level: ${userLevel}`);

    // Calculate time limit based on level
    const baseTime = 10;
    const timeLimit = Math.max(5, baseTime - (userLevel - 1) * 2);

    // Get user's struggle letters
    const struggleLetters = await getUserStruggleLetters(userUUID);

    // Generate words using GPT or fallback
    const words = await generateWordsWithGPT(userLevel, struggleLetters, 'speed');

    // Add time limits to words
    const wordsWithTime = words.map(item => ({
      word: item.word,
      timeLimit: timeLimit,
      hint: item.hint
    }));

    return {
      success: true,
      wordsWithTime: wordsWithTime,
      level: userLevel,
      totalWords: wordsWithTime.length,
      totalTime: wordsWithTime.reduce((sum, item) => sum + item.timeLimit, 0),
      timestamp: new Date().toISOString(),
      struggleLetters: struggleLetters
    };

  } catch (error) {
    console.error('Speed game error:', error);

    // Fallback response
    const fallbackWords = getDefaultWordsForLevel(userLevel);
    const timeLimit = Math.max(5, 10 - (userLevel - 1) * 2);

    const wordsWithTime = fallbackWords.map(item => ({
      word: item.word,
      timeLimit: timeLimit,
      hint: item.hint
    }));

    return {
      success: true,
      wordsWithTime: wordsWithTime,
      level: userLevel,
      totalWords: wordsWithTime.length,
      totalTime: wordsWithTime.reduce((sum, item) => sum + item.timeLimit, 0),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Default words for fallback (when GPT fails or no API key)
 */
function getDefaultWordsForLevel(level) {
  const wordsByDifficulty = {
    1: [
      { word: "HI", hint: "A casual greeting" },
      { word: "BYE", hint: "A farewell" },
      { word: "YES", hint: "Agreement" }
    ],
    2: [
      { word: "HELLO", hint: "A formal greeting" },
      { word: "GOOD", hint: "Positive quality" },
      { word: "WORLD", hint: "The Earth" },
      { word: "HELP", hint: "Assistance" }
    ],
    3: [
      { word: "FRIEND", hint: "A close companion" },
      { word: "FAMILY", hint: "Relatives" },
      { word: "SCHOOL", hint: "Place of learning" },
      { word: "THANK", hint: "Express gratitude" },
      { word: "PLEASE", hint: "Polite request" }
    ],
    4: [
      { word: "COMPUTER", hint: "Electronic device" },
      { word: "TELEPHONE", hint: "Communication device" },
      { word: "BEAUTIFUL", hint: "Very pretty" },
      { word: "IMPORTANT", hint: "Of great significance" },
      { word: "TOGETHER", hint: "With each other" },
      { word: "PRACTICE", hint: "Repeated exercise" }
    ],
    5: [
      { word: "COMMUNICATE", hint: "Exchange information" },
      { word: "UNDERSTAND", hint: "Comprehend meaning" },
      { word: "APPRECIATE", hint: "Be grateful for" },
      { word: "CELEBRATE", hint: "Mark a special occasion" },
      { word: "LANGUAGE", hint: "System of communication" },
      { word: "LEARNING", hint: "Acquiring knowledge" },
      { word: "CHALLENGE", hint: "A difficult task" }
    ]
  };

  const levelWords = wordsByDifficulty[Math.min(level, 5)] || wordsByDifficulty[1];
  const numWords = level + 2; // Level number + 2 words

  // Shuffle and select the required number of words
  const shuffled = [...levelWords].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(numWords, shuffled.length));
}

/**
 * Reset letter statistics for a user (useful for testing)
 */
export async function resetLetterStats(userId) {
  try {
    const letterStats = {};
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      letterStats[letter] = { attempts: 0, skips: 0, successes: 0 };
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      letterStats: letterStats,
      struggleLetters: { high: [], medium: [], low: [] },
      lastStatsUpdate: new Date()
    });

    console.log('Letter stats reset successfully');
  } catch (error) {
    console.error('Error resetting letter stats:', error);
  }
}

// Export all functions
export default {
  quizGame,
  speedGame,
  updateLetterStats,
  resetLetterStats
};