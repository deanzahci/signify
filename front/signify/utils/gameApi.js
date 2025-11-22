// Game API functions that can be called directly from the frontend
// These will eventually integrate with AI for dynamic question generation

/**
 * Quiz Game function
 * @param {string} userUUID - Firebase user ID
 * @param {number} userLevel - User's current level
 * @returns {Object} Quiz game data with words
 */
export async function quizGame(userUUID, userLevel) {
  try {
    // Log the request (you can send this to Firebase Analytics later)
    console.log(`Quiz Game request - User: ${userUUID}, Level: ${userLevel}`);

    // For now, return hardcoded words
    // TODO: In the future, integrate with AI to generate level-appropriate words
    const words =[
      {
        word: "hello",
        hint: "timeLimit",
     
      },
      {
        word: "world",
        hint: "timeLimit",
    
      }
    ];

    // Simulate async operation (like future AI call)
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      words: words,
      level: userLevel,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Quiz game error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Speed Game function
 * @param {string} userUUID - Firebase user ID
 * @param {number} userLevel - User's current level
 * @returns {Object} Speed game data with words and time limits
 */
export async function speedGame(userUUID, userLevel) {
  try {
    // Log the request (you can send this to Firebase Analytics later)
    console.log(`Speed Game request - User: ${userUUID}, Level: ${userLevel}`);

    // Base time limit in seconds
    const baseTime = 10;

    // Calculate time limit based on level (higher level = less time)
    // Minimum 5 seconds per word
    const timeLimit = Math.max(5, baseTime - (userLevel - 1) * 2);

    // For now, return hardcoded words with time limits
    // TODO: In the future, integrate with AI to generate appropriate words and times
    const wordsWithTime = [
      {
        word: "hello",
        timeLimit: timeLimit,
     
      },
      {
        word: "world",
        timeLimit: timeLimit,
    
      }
    ];

    // Simulate async operation (like future AI call)
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      wordsWithTime: wordsWithTime,
      level: userLevel,
      totalWords: wordsWithTime.length,
      totalTime: wordsWithTime.reduce((sum, item) => sum + item.timeLimit, 0),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Speed game error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper function to get difficulty-appropriate words
 * This will be replaced with AI generation later
 * @param {number} level - User's current level
 * @returns {Array} Array of words appropriate for the level
 */
function getWordsForLevel(level) {
  // This is placeholder logic
  // In production, this would call an AI service
  const wordsByDifficulty = {
    1: ["hi", "bye", "yes", "no"],
    2: ["hello", "world", "good", "bad"],
    3: ["friend", "family", "school", "work"],
    4: ["computer", "telephone", "restaurant", "beautiful"],
    5: ["communicate", "understand", "appreciate", "celebrate"]
  };

  const levelWords = wordsByDifficulty[Math.min(level, 5)] || wordsByDifficulty[1];

  // Return 2 random words from the level
  const shuffled = [...levelWords].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

/**
 * Future AI integration placeholder
 * @param {string} userUUID - Firebase user ID
 * @param {number} userLevel - User's current level
 * @param {string} gameType - Type of game ('quiz' or 'speed')
 * @returns {Promise} AI-generated content
 */
async function generateWithAI(userUUID, userLevel, gameType) {
  // TODO: Implement AI integration here
  // This could call OpenAI, Claude, or a custom model
  // For sign language, you might want to consider:
  // - Word frequency in ASL
  // - Finger spelling complexity
  // - Common phrases vs individual words

  throw new Error('AI integration not yet implemented');
}

// Export all functions
export default {
  quizGame,
  speedGame
};