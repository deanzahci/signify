// Game API functions that can be called directly from the frontend
// These integrate with OpenAI GPT for dynamic word generation based on struggle letters

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Approved word list for WORD mode only
// Letter mode can use any letters
const APPROVED_WORD_LIST = [
  'actor', 'america', 'answer', 'any', 'arrogant', 'asia', 'austria', 'autumn',
  'beard', 'bedroom', 'boy', 'boyfriend',
  'cat', 'chef', 'chocolate', 'clock', 'come', 'corn', 'culture',
  'dessert', 'disgusted', 'dry', 'dryer',
  'early', 'ears', 'emotional', 'engineering',
  'face', 'father', 'furniture',
  'game', 'germany', 'glue', 'gone', 'graduate', 'gray',
  'half hour', 'hashtag', 'hour',
  'important', 'internet',
  'jacket', 'janitor', 'jealous',
  'last', 'later', 'light', 'list', 'lousy', 'love it',
  'marry', 'mean', 'mix', 'my',
  'newspaper', 'nosy', 'nuts',
  'pencil', 'practice',
  'ready', 'rich',
  'screwdriver', 'shower', 'sign language', 'sit', 'sleepy', 'slow', 'sports', 'stand', 'stay',
  'thank you', 'train', 'tuesday',
  'uncle',
  'what\'s up', 'wife', 'wow',
  // Common greetings/words that are already in ASL
  'good afternoon', 'every night', 'every week', 'last week'
];

// Convert to uppercase for consistency
const APPROVED_WORDS_UPPER = APPROVED_WORD_LIST.map(word => word.toUpperCase());

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
const generateGPTPrompt = (level, struggleLetters, gameType, isWordMode) => {
  const wordCount = level + 2; // Level number + 2 problems

  const struggleInfo = struggleLetters && (struggleLetters.high?.length > 0 || struggleLetters.medium?.length > 0)
    ? `Focus on these struggle letters:
- High priority (use frequently): ${struggleLetters.high?.join(', ') || 'none'}
- Medium priority (use moderately): ${struggleLetters.medium?.join(', ') || 'none'}`
    : 'No specific letter focus needed.';

  // For word mode, restrict to approved list
  if (isWordMode) {
    return `Select ${wordCount} words from this EXACT list for ASL practice at level ${level}:

APPROVED WORDS LIST:
${APPROVED_WORD_LIST.join(', ')}

${struggleInfo}

Requirements:
1. You MUST ONLY use words from the provided list above
2. Select words appropriate for level ${level} difficulty
3. ${struggleLetters?.high?.length > 0 ? 'Prefer words containing struggle letters when possible' : 'Mix different difficulty levels'}
4. Provide a simple, clear hint for each word
5. Do NOT create or modify words - use them exactly as shown in the list

Return ONLY a JSON array in this exact format, no other text:
[
  {"word": "ACTOR", "hint": "A person who performs in movies or plays"},
  {"word": "CAT", "hint": "A small furry pet"}
]`;
  }

  // For letter mode, allow any words
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
    // Check if word mode is enabled
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word';

    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      console.log('No API key, falling back to default words');
      return getDefaultWordsForLevel(level, isWordMode);
    }

    const prompt = generateGPTPrompt(level, struggleLetters, gameType, isWordMode);
    console.log('GPT Prompt:', prompt);
    console.log('Detection mode:', isWordMode ? 'word' : 'letter');

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
      let formattedWords = words.map(item => ({
        word: item.word.toUpperCase(),
        hint: item.hint || 'Practice this word'
      }));

      // For word mode, validate that all words are from approved list
      if (isWordMode) {
        const validWords = formattedWords.filter(item =>
          APPROVED_WORDS_UPPER.includes(item.word.toUpperCase())
        );

        if (validWords.length === 0) {
          console.log('GPT generated invalid words for word mode, using fallback');
          return getDefaultWordsForLevel(level, isWordMode);
        }

        formattedWords = validWords;
        console.log('Validated words for word mode:', formattedWords);
      }

      return formattedWords;
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      return getDefaultWordsForLevel(level, isWordMode);
    }

  } catch (error) {
    console.error('GPT generation failed:', error);
    // Fallback to default words
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word';
    return getDefaultWordsForLevel(level, isWordMode);
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
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word';
    return {
      success: true,
      words: getDefaultWordsForLevel(userLevel, isWordMode),
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
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word';
    const fallbackWords = getDefaultWordsForLevel(userLevel, isWordMode);
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
function getDefaultWordsForLevel(level, isWordMode = false) {
  // For word mode, use only approved words
  if (isWordMode) {
    const approvedWordBank = [
      // Level 1 - Simple short words
      { word: "CAT", hint: "A small furry pet" },
      { word: "BOY", hint: "A young male" },
      { word: "MY", hint: "Belonging to me" },
      { word: "DRY", hint: "Not wet" },
      { word: "WOW", hint: "Expression of surprise" },

      // Level 2 - Medium length words
      { word: "ACTOR", hint: "Performs in movies" },
      { word: "BEARD", hint: "Facial hair" },
      { word: "CHEF", hint: "Professional cook" },
      { word: "CORN", hint: "Yellow vegetable" },
      { word: "EARS", hint: "Used for hearing" },
      { word: "FACE", hint: "Front of head" },
      { word: "GAME", hint: "Fun activity" },
      { word: "GLUE", hint: "Sticky substance" },
      { word: "GONE", hint: "Not here anymore" },
      { word: "GRAY", hint: "Color between black and white" },
      { word: "HOUR", hint: "60 minutes" },
      { word: "LAST", hint: "Final one" },
      { word: "LIST", hint: "Items written down" },
      { word: "MEAN", hint: "Not nice" },
      { word: "NUTS", hint: "Tree seeds to eat" },
      { word: "RICH", hint: "Having lots of money" },
      { word: "SLOW", hint: "Not fast" },
      { word: "STAY", hint: "Don't leave" },
      { word: "WIFE", hint: "Married woman" },

      // Level 3+ - Longer words
      { word: "ANSWER", hint: "Response to a question" },
      { word: "AUTUMN", hint: "Fall season" },
      { word: "CLOCK", hint: "Tells time" },
      { word: "DESSERT", hint: "Sweet after meal" },
      { word: "DRYER", hint: "Machine that dries clothes" },
      { word: "EARLY", hint: "Before expected time" },
      { word: "FATHER", hint: "Male parent" },
      { word: "JACKET", hint: "Outerwear" },
      { word: "LATER", hint: "Not now" },
      { word: "LIGHT", hint: "Brightness" },
      { word: "LOUSY", hint: "Very bad" },
      { word: "MARRY", hint: "Join in marriage" },
      { word: "PENCIL", hint: "Writing tool" },
      { word: "READY", hint: "Prepared" },
      { word: "SHOWER", hint: "Wash with water" },
      { word: "SLEEPY", hint: "Tired" },
      { word: "SPORTS", hint: "Athletic activities" },
      { word: "STAND", hint: "Be on feet" },
      { word: "TRAIN", hint: "Railroad vehicle" },
      { word: "UNCLE", hint: "Parent's brother" },

      // Level 4+ - Complex words
      { word: "AMERICA", hint: "United States country" },
      { word: "ARROGANT", hint: "Too proud" },
      { word: "AUSTRIA", hint: "European country" },
      { word: "BEDROOM", hint: "Room for sleeping" },
      { word: "BOYFRIEND", hint: "Male romantic partner" },
      { word: "CHOCOLATE", hint: "Sweet brown treat" },
      { word: "CULTURE", hint: "Society's customs" },
      { word: "DISGUSTED", hint: "Feeling of revulsion" },
      { word: "EMOTIONAL", hint: "Full of feelings" },
      { word: "FURNITURE", hint: "Tables, chairs, etc." },
      { word: "GERMANY", hint: "European country" },
      { word: "GRADUATE", hint: "Complete school" },
      { word: "HASHTAG", hint: "Social media symbol" },
      { word: "IMPORTANT", hint: "Very significant" },
      { word: "INTERNET", hint: "Global computer network" },
      { word: "JANITOR", hint: "Building cleaner" },
      { word: "JEALOUS", hint: "Envious feeling" },
      { word: "NEWSPAPER", hint: "Daily news publication" },
      { word: "NOSY", hint: "Too curious" },
      { word: "PRACTICE", hint: "Repeated training" },
      { word: "SCREWDRIVER", hint: "Tool for screws" },
      { word: "TUESDAY", hint: "Day after Monday" },

      // Multi-word phrases (use underscores for spaces in actual detection)
      { word: "THANK YOU", hint: "Expression of gratitude" },
      { word: "WHAT'S UP", hint: "Casual greeting" },
      { word: "LOVE IT", hint: "Really like something" },
      { word: "SIGN LANGUAGE", hint: "Visual communication" },
      { word: "GOOD AFTERNOON", hint: "Midday greeting" },
      { word: "EVERY NIGHT", hint: "Each evening" },
      { word: "EVERY WEEK", hint: "Weekly occurrence" },
      { word: "LAST WEEK", hint: "Previous seven days" },
      { word: "HALF HOUR", hint: "30 minutes" },
      { word: "ENGINEERING", hint: "Technical design field" },
      { word: "ASIA", hint: "Large continent" }
    ];

    // Filter words by difficulty for the level
    let filteredWords = [];

    if (level <= 1) {
      // Level 1: 3-4 letter words
      filteredWords = approvedWordBank.filter(w =>
        w.word.replace(/\s+/g, '').length <= 4 && !w.word.includes(' ')
      );
    } else if (level === 2) {
      // Level 2: 4-5 letter words
      filteredWords = approvedWordBank.filter(w => {
        const len = w.word.replace(/\s+/g, '').length;
        return len >= 4 && len <= 6 && !w.word.includes(' ');
      });
    } else if (level === 3) {
      // Level 3: 5-7 letter words
      filteredWords = approvedWordBank.filter(w => {
        const len = w.word.replace(/\s+/g, '').length;
        return len >= 5 && len <= 8 && !w.word.includes(' ');
      });
    } else if (level === 4) {
      // Level 4: 7+ letter words
      filteredWords = approvedWordBank.filter(w => {
        const len = w.word.replace(/\s+/g, '').length;
        return len >= 7 && !w.word.includes(' ');
      });
    } else {
      // Level 5+: Include multi-word phrases
      filteredWords = approvedWordBank.filter(w => {
        const len = w.word.replace(/\s+/g, '').length;
        return len >= 8 || w.word.includes(' ');
      });
    }

    // If not enough words for the level, add some from adjacent levels
    if (filteredWords.length < level + 2) {
      filteredWords = approvedWordBank;
    }

    const numWords = level + 2;
    const shuffled = [...filteredWords].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(numWords, shuffled.length));
  }

  // For letter mode, use the original word bank (any words allowed)
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