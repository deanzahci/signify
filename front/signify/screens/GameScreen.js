import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedColors, useThemedShadow } from '../hooks/useThemedColors';
import { NBIcon } from '../components/NeoBrutalistIcons';
import { quizGame, speedGame, updateLetterStats } from '../utils/gameApi';
import signConfig from '../config/signRecognition';

// Import the 5 separate screens
import GameSelectScreen from './GameSelectScreen';
import QuizPreviewScreen from './QuizPreviewScreen';
import QuizGameScreen from './QuizGameScreen';
import SpeedPreviewScreen from './SpeedPreviewScreen';
import SpeedGameScreen from './SpeedGameScreen';

// Fallback word bank with hints - used when API doesn't provide words
const FALLBACK_WORD_BANK = [
  { word: 'HELLO', hint: 'A common greeting' },
  { word: 'WORLD', hint: 'The Earth or global community' },
  { word: 'LEARN', hint: 'To acquire knowledge' },
  { word: 'TEACH', hint: 'To instruct or educate' },
  { word: 'STUDY', hint: 'To examine carefully' },
  { word: 'WRITE', hint: 'To put words on paper' },
  { word: 'SPEAK', hint: 'To communicate verbally' },
  { word: 'THINK', hint: 'To use your mind' },
  { word: 'SMILE', hint: 'A happy facial expression' },
  { word: 'HAPPY', hint: 'Feeling joy or contentment' },
  { word: 'FRIEND', hint: 'A person you trust and like' },
  { word: 'FAMILY', hint: 'Your closest relatives' },
  { word: 'MUSIC', hint: 'Sounds arranged in harmony' },
  { word: 'DANCE', hint: 'Moving rhythmically to music' },
  { word: 'DREAM', hint: 'Images during sleep or aspirations' },
];

// Hint generator for API words (basic hints based on word)
const generateHint = (word) => {
  const upperWord = word.toUpperCase();
  const hints = {
    'HELLO': 'A common greeting',
    'WORLD': 'The Earth or global community',
    'HI': 'A casual greeting',
    'BYE': 'A way to say goodbye',
    'YES': 'An affirmative answer',
    'NO': 'A negative answer',
    'GOOD': 'Something positive or well-done',
    'BAD': 'Something negative or wrong',
  };
  return hints[upperWord] || `A word with ${word.length} letters`;
};

const GameScreen = () => {
  // Auth context
  const { user } = useAuth();

  // Main navigation state - now includes all 5 screens
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'quizPreview', 'quizGame', 'speedPreview', 'speedGame'

  // User levels
  const [userLevelQuiz, setUserLevelQuiz] = useState(1);
  const [userLevelSpeed, setUserLevelSpeed] = useState(1);

  // User stats
  const [userStats, setUserStats] = useState({
    quizHighScore: 0,
    bestWPM: 0,
    gamesPlayed: 0,
  });

  // API Response storage
  const [quizWordsFromApi, setQuizWordsFromApi] = useState([]);
  const [speedWordsFromApi, setSpeedWordsFromApi] = useState([]);

  // Quiz Mode States
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizScore, setQuizScore] = useState(0);
  const [quizRound, setQuizRound] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [usedQuizWords, setUsedQuizWords] = useState([]);
  const [quizGameActive, setQuizGameActive] = useState(false);
  const [quizRevealWord, setQuizRevealWord] = useState(false);

  // ASL Camera States
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [signedLetters, setSignedLetters] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Typing Speed Run States
  const [typingWords, setTypingWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [typingInput, setTypingInput] = useState('');
  const [typingScore, setTypingScore] = useState(0);
  const [typingStartTime, setTypingStartTime] = useState(null);
  const [typingWPM, setTypingWPM] = useState(0);
  const [typingGameActive, setTypingGameActive] = useState(false);
  const [typingTimer, setTypingTimer] = useState(30);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch user levels and stats from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (user && user.id) {
        try {
          const userRef = doc(db, 'users', user.id);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserLevelQuiz(userData.levelQuiz || 1);
            setUserLevelSpeed(userData.levelSpeed || 1);
            setUserStats({
              quizHighScore: userData.highScoreQuiz || 0,
              bestWPM: userData.highScoreSpeed || 0,
              gamesPlayed: userData.gamesPlayed || 0,
            });
            console.log('User data loaded:', {
              quiz: userData.levelQuiz,
              speed: userData.levelSpeed,
              stats: userStats
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // Pulse animation for active elements
  useEffect(() => {
    if (currentScreen !== 'menu') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentScreen]);

  // ==================== QUIZ MODE FUNCTIONS ====================

  const startQuizMode = async () => {
    console.log("Starting Quiz Mode")

    // Navigate to quiz preview screen immediately for instant transition
    setCurrentScreen('quizPreview');
    setQuizScore(0);
    setQuizRound(0);
    setUsedQuizWords([]);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizGameActive(false);
    setQuizRevealWord(false);

    let wordsToUse = FALLBACK_WORD_BANK;

    // Call game API with user data (after navigation for perceived speed)
    if (user && user.id) {
      try {
        console.log('Calling quizGame API...');
        const apiResponse = await quizGame(user.id, userLevelQuiz);
        console.log('Quiz API Response:', apiResponse);

        if (apiResponse.success && apiResponse.words && apiResponse.words.length > 0) {
          console.log('Quiz words from API:', apiResponse.words);

          // Check if API words already have hint property (new format)
          const wordsWithHints = apiResponse.words.map(item => {
            if (typeof item === 'object' && item.word && item.hint) {
              // API returned {word, hint} format - validate hint is useful
              const isValidHint = item.hint &&
                                  item.hint !== 'timeLimit' &&
                                  item.hint.length > 3 &&
                                  !item.hint.includes('undefined');

              return {
                word: item.word.toUpperCase(),
                hint: isValidHint ? item.hint : generateHint(item.word)
              };
            } else if (typeof item === 'string') {
              // API returned just strings
              return {
                word: item.toUpperCase(),
                hint: generateHint(item)
              };
            } else {
              console.warn('Unexpected word format:', item);
              return null;
            }
          }).filter(item => item !== null);

          wordsToUse = wordsWithHints;
          console.log('Using words from API:', JSON.stringify(wordsToUse));
        } else {
          // Fallback to default word bank
          console.log('Using fallback word bank');
          wordsToUse = FALLBACK_WORD_BANK;
        }
      } catch (error) {
        console.error('Error calling quiz API:', error);
        wordsToUse = FALLBACK_WORD_BANK;
      }
    } else {
      console.log("No user logged in - using fallback")
      wordsToUse = FALLBACK_WORD_BANK;
    }

    // Set the API words in state
    setQuizWordsFromApi(wordsToUse);

    // Generate first question immediately with the words we just fetched
    const availableWords = wordsToUse.filter(
      item => ![] .includes(item.word) // Empty array since we reset usedQuizWords
    );

    if (availableWords.length > 0) {
      const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
      setQuizQuestion(randomWord);
      setUsedQuizWords([randomWord.word]);
      console.log('First quiz question set:', randomWord);
    }
  };

  const generateQuizQuestion = () => {
    // Use API words if available, otherwise fallback
    const wordBank = quizWordsFromApi.length > 0 ? quizWordsFromApi : FALLBACK_WORD_BANK;

    // Filter out already used words
    const availableWords = wordBank.filter(
      item => !usedQuizWords.includes(item.word)
    );

    if (availableWords.length === 0) {
      // Level completed - all words used, move to next level
      setQuizFeedback('[SUCCESS] LEVEL COMPLETED! Moving to next level...');
      setQuizGameActive(false);
      updateQuizLevelInFirestore();

      // After updating Firestore, restart with next level
      setTimeout(() => {
        startQuizMode(); // This will fetch new words for the next level
      }, 3000);
      return;
    }

    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    setQuizQuestion(randomWord);
    setQuizAnswer('');
    setQuizFeedback('');
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizRevealWord(false);
    setUsedQuizWords([...usedQuizWords, randomWord.word]);
  };

  const startQuizGame = () => {
    console.log('Starting quiz game...');
    setQuizGameActive(true);
    setQuizFeedback('');
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setCurrentScreen('quizGame');
  };

  const exitQuizMode = () => {
    setCurrentScreen('menu');
    setQuizQuestion(null);
    setQuizAnswer('');
    setQuizFeedback('');
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizGameActive(false);
    setQuizRevealWord(false);
  };

  const skipQuizQuestion = async () => {
    setQuizRound(quizRound + 1);
    setQuizFeedback('[SKIP] SKIPPED');

    // Track the skipped letter as a struggle
    if (quizQuestion && user?.id) {
      const skippedLetter = quizQuestion.word[currentLetterIndex];
      await updateLetterStats(user.id, skippedLetter, 'skip');
    }

    // Check if there are more words available
    const wordBank = quizWordsFromApi.length > 0 ? quizWordsFromApi : FALLBACK_WORD_BANK;
    const availableWords = wordBank.filter(
      item => !usedQuizWords.includes(item.word)
    );

    if (availableWords.length === 0) {
      // Level completed - all words used
      setQuizGameActive(false);
      setTimeout(() => {
        setQuizFeedback('[SUCCESS] LEVEL COMPLETED! Moving to next level...');
        updateQuizLevelInFirestore();
        // After a delay, restart with next level
        setTimeout(() => {
          startQuizMode(); // This will fetch new words for the next level
        }, 2000);
      }, 1000);
    } else {
      // More words available, continue
      setTimeout(() => {
        generateQuizQuestion();
      }, 1000);
    }
  };

  // Update quiz level in Firestore after completing all words
  const updateQuizLevelInFirestore = async () => {
    if (user && user.id) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          levelQuiz: increment(1),
          highScoreQuiz: quizScore > userStats.quizHighScore ? quizScore : userStats.quizHighScore,
          gamesPlayed: increment(1)
        });
        console.log(' Quiz level updated in Firestore!');
        // Update local state
        setUserLevelQuiz(prev => prev + 1);
        if (quizScore > userStats.quizHighScore) {
          setUserStats(prev => ({ ...prev, quizHighScore: quizScore }));
        }
      } catch (error) {
        console.error('Error updating quiz level:', error);
      }
    }
  };

  // Simulate sign detection for Quiz Mode
  const simulateQuizSignDetection = async () => {
    if (!quizQuestion || isDetecting || !quizGameActive) return;

    setIsDetecting(true);

    // Check if we're in word mode
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word' || (!savedMode && signConfig.recognition.defaultMode === 'word');

    // Simulate detection delay (500ms)
    setTimeout(async () => {
      if (isWordMode) {
        // Word mode: Complete the entire word at once
        const allLetters = quizQuestion.word.split('');
        setSignedLetters(allLetters);
        setCurrentLetterIndex(quizQuestion.word.length); // Set to end
        setQuizFeedback(`[CHECK] Word Detected: ${quizQuestion.word}`);

        // Track successful word detection
        if (user?.id) {
          for (let letter of allLetters) {
            await updateLetterStats(user.id, letter, 'success');
          }
        }

        // Word completed!
        setTimeout(() => {
          setQuizScore(quizScore + 10);
          setQuizFeedback('[SUCCESS] CORRECT! +10 points');
          setQuizRound(quizRound + 1);

          // Check if there are more words in this level
          const wordBank = quizWordsFromApi.length > 0 ? quizWordsFromApi : FALLBACK_WORD_BANK;
          const availableWords = wordBank.filter(
            item => !usedQuizWords.includes(item.word)
          );

          if (availableWords.length === 0) {
            // Level completed - stop game
            setQuizGameActive(false);
          }

          setTimeout(() => {
            generateQuizQuestion();
          }, 2000);
        }, 1000); // Wait 1 second to show the last letter before showing success message
      } else {
        // Letter mode: Progress letter by letter
        const currentLetter = quizQuestion.word[currentLetterIndex];
        const newSignedLetters = [...signedLetters, currentLetter];
        setSignedLetters(newSignedLetters);
        setQuizFeedback(`[CHECK] Detected: ${currentLetter}`);

        // Track successful letter detection
        if (user?.id) {
          await updateLetterStats(user.id, currentLetter, 'success');
        }

        // Check if word is complete
        if (currentLetterIndex + 1 >= quizQuestion.word.length) {
          // Word completed! Increment to show the last letter first
          setCurrentLetterIndex(currentLetterIndex + 1);

          // Then wait a moment to show the last letter before success message
          setTimeout(() => {
            setQuizScore(quizScore + 10);
            setQuizFeedback('[SUCCESS] CORRECT! +10 points');
            setQuizRound(quizRound + 1);

            // Check if there are more words in this level
            const wordBank = quizWordsFromApi.length > 0 ? quizWordsFromApi : FALLBACK_WORD_BANK;
            const availableWords = wordBank.filter(
              item => !usedQuizWords.includes(item.word)
            );

            if (availableWords.length === 0) {
              // Level completed - stop game
              setQuizGameActive(false);
            }

            setTimeout(() => {
              generateQuizQuestion();
            }, 2000);
          }, 1000); // Wait 1 second to show the last letter before showing success message
        } else {
          // Move to next letter
          setCurrentLetterIndex(currentLetterIndex + 1);
          setTimeout(() => {
            setQuizFeedback('');
          }, 1000);
        }
      }

      setIsDetecting(false);
    }, 500);
  };

  // ==================== TYPING SPEED RUN FUNCTIONS ====================

  const startTypingMode = async () => {
    // Navigate to speed preview screen immediately for instant transition
    setCurrentScreen('speedPreview');
    setTypingScore(0);
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setTypingGameActive(false);

    let wordsToUse = FALLBACK_WORD_BANK.slice(0, 20).map(item => ({
      word: item.word,
      timeLimit: 10
    }));
    let timerDuration = 30;

    // Call game API with user data (after navigation for perceived speed)
    if (user && user.id) {
      try {
        console.log('Calling speedGame API...');
        const apiResponse = await speedGame(user.id, userLevelSpeed);
        console.log('Speed API Response:', apiResponse);

        if (apiResponse.success && apiResponse.wordsWithTime && apiResponse.wordsWithTime.length > 0) {
          console.log('Speed game data from API:', apiResponse);
          console.log('Words with time limits:', apiResponse.wordsWithTime);

          // Convert API response to required format (NO hints needed for speed mode)
          const wordsForSpeed = apiResponse.wordsWithTime.map(item => ({
            word: item.word.toUpperCase(),
            timeLimit: item.timeLimit
          }));

          wordsToUse = wordsForSpeed;
          timerDuration = apiResponse.totalTime || 30;
          console.log('Using words from API for speed game:', JSON.stringify(wordsToUse));
        } else {
          // Fallback to default word bank
          console.log('Using fallback word bank for speed game');
        }
      } catch (error) {
        console.error('Error calling speed API:', error);
      }
    } else {
      console.log('No user logged in - using fallback for speed game');
    }

    // Set the API words and timer in state
    setSpeedWordsFromApi(wordsToUse);
    setTypingWords(wordsToUse);
    setTypingTimer(timerDuration);

    // Set first word as current question immediately with the words we just fetched
    if (wordsToUse.length > 0) {
      setQuizQuestion(wordsToUse[0]);
      console.log('First speed word set:', wordsToUse[0]);
    }
  };

  const startTypingGame = () => {
    console.log('Starting typing game...');
    setTypingGameActive(true);
    setTypingStartTime(Date.now());
    setQuizFeedback('');
    setCurrentScreen('speedGame');
  };

  const exitTypingMode = () => {
    setCurrentScreen('menu');
    setTypingGameActive(false);
    setQuizQuestion(null);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
  };

  const skipWord = async () => {
    if (currentWordIndex < typingWords.length - 1) {
      // Track all remaining letters in the current word as skipped
      if (quizQuestion && user?.id) {
        const remainingLetters = quizQuestion.word.slice(currentLetterIndex);
        for (let letter of remainingLetters) {
          await updateLetterStats(user.id, letter, 'skip');
        }
      }

      setCurrentWordIndex(currentWordIndex + 1);
      setCurrentLetterIndex(0);
      setSignedLetters([]);
      setQuizQuestion(typingWords[currentWordIndex + 1]);
      setQuizFeedback('[SKIP] SKIPPED');
      setTimeout(() => {
        setQuizFeedback('');
      }, 1000);
    }
  };

  // Handle timer end for speed game
  const handleTypingTimerEnd = () => {
    setTypingGameActive(false);
    // Timer ended - show completion message then move to next level
    setQuizFeedback('⏱️ TIME\'S UP! Level completed!');
    updateSpeedLevelInFirestore();

    // After a delay, restart with next level
    setTimeout(() => {
      startTypingMode(); // This will fetch new words for the next level
    }, 3000);
  };

  // Handle all words completed in speed game
  const handleAllWordsCompleted = () => {
    setTypingGameActive(false);
    setQuizFeedback('[SUCCESS] ALL WORDS COMPLETED! Moving to next level...');
    updateSpeedLevelInFirestore();

    // After a delay, restart with next level
    setTimeout(() => {
      startTypingMode(); // This will fetch new words for the next level
    }, 3000);
  };

  // Update speed level in Firestore after timer ends
  const updateSpeedLevelInFirestore = async () => {
    if (user && user.id) {
      try {
        const userRef = doc(db, 'users', user.id);
        // Use Math.max to ensure we always keep the highest score
        const newHighScore = Math.max(typingScore, userStats.bestWPM || 0);
        await updateDoc(userRef, {
          levelSpeed: increment(1),
          highScoreSpeed: newHighScore,
          gamesPlayed: increment(1)
        });
        console.log(`✅ Speed level updated in Firestore! Score: ${typingScore}, High Score: ${newHighScore}`);
        // Update local state
        setUserLevelSpeed(prev => prev + 1);
        if (typingScore > userStats.bestWPM) {
          setUserStats(prev => ({ ...prev, bestWPM: typingScore }));
        }
      } catch (error) {
        console.error('Error updating speed level:', error);
      }
    }
  };

  // Simulate sign detection for SignSpeed mode
  const simulateSignDetection = async () => {
    if (!quizQuestion || isDetecting || !typingGameActive) return;

    setIsDetecting(true);

    // Check if we're in word mode
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word' || (!savedMode && signConfig.recognition.defaultMode === 'word');

    // Simulate detection delay (500ms)
    setTimeout(async () => {
      if (isWordMode) {
        // Word mode: Complete the entire word at once
        const allLetters = quizQuestion.word.split('');
        setSignedLetters(allLetters);
        setCurrentLetterIndex(quizQuestion.word.length); // Set to end
        setQuizFeedback(`[CHECK] Word Detected: ${quizQuestion.word}`);

        // Track successful word detection
        if (user?.id) {
          for (let letter of allLetters) {
            await updateLetterStats(user.id, letter, 'success');
          }
        }

        // Word completed! Calculate points based on level (10 points base + 5 per level)
        const pointsEarned = 10 + (userLevelSpeed * 5);
        setTypingScore(typingScore + pointsEarned);
        setQuizFeedback(`[SUCCESS] WORD COMPLETED! +${pointsEarned} points`);

        setTimeout(() => {
          // Move to next word
          if (currentWordIndex < typingWords.length - 1) {
            setCurrentWordIndex(currentWordIndex + 1);
            setCurrentLetterIndex(0);
            setSignedLetters([]);
            setQuizQuestion(typingWords[currentWordIndex + 1]);
            setQuizFeedback('');
          } else {
            // Finished all words before timer
            handleAllWordsCompleted();
          }
        }, 1500);
      } else {
        // Letter mode: Progress letter by letter
        const currentLetter = quizQuestion.word[currentLetterIndex];
        const newSignedLetters = [...signedLetters, currentLetter];
        setSignedLetters(newSignedLetters);
        setQuizFeedback(`[CHECK] Detected: ${currentLetter}`);

        // Track successful letter detection
        if (user?.id) {
          await updateLetterStats(user.id, currentLetter, 'success');
        }

        // Check if word is complete
        if (currentLetterIndex + 1 >= quizQuestion.word.length) {
          // Word completed! Increment to show the last letter first
          setCurrentLetterIndex(currentLetterIndex + 1);
          // Calculate points based on level (10 points base + 5 per level)
          const pointsEarned = 10 + (userLevelSpeed * 5);
          setTypingScore(typingScore + pointsEarned);
          setQuizFeedback(`[SUCCESS] WORD COMPLETED! +${pointsEarned} points`);

          setTimeout(() => {
            // Move to next word
            if (currentWordIndex < typingWords.length - 1) {
              setCurrentWordIndex(currentWordIndex + 1);
              setCurrentLetterIndex(0);
              setSignedLetters([]);
              setQuizQuestion(typingWords[currentWordIndex + 1]);
              setQuizFeedback('');
            } else {
              // Finished all words before timer
              handleAllWordsCompleted();
            }
          }, 1500);
        } else {
          // Move to next letter
          setCurrentLetterIndex(currentLetterIndex + 1);
          setTimeout(() => {
            setQuizFeedback('');
          }, 1000);
        }
      }

      setIsDetecting(false);
    }, 500);
  };

  const onCameraReady = () => {
    console.log('Camera is ready!');
  };

  // Handle mode selection from menu
  const handleModeSelect = (mode) => {
    if (mode === 'quizPreview') {
      startQuizMode();
    } else if (mode === 'speedPreview') {
      startTypingMode();
    }
  };

  // ==================== MAIN RENDER ====================

  // Render the appropriate screen based on currentScreen state
  switch (currentScreen) {
    case 'menu':
      return (
        <GameSelectScreen
          onSelectMode={handleModeSelect}
          userStats={userStats}
        />
      );

    case 'quizPreview':
      return (
        <QuizPreviewScreen
          quizQuestion={quizQuestion}
          quizScore={quizScore}
          quizRound={quizRound}
          userLevelQuiz={userLevelQuiz}
          onStartGame={startQuizGame}
          onGoBack={exitQuizMode}
        />
      );

    case 'quizGame':
      return (
        <QuizGameScreen
          quizQuestion={quizQuestion}
          quizScore={quizScore}
          quizRound={quizRound}
          userLevelQuiz={userLevelQuiz}
          quizFeedback={quizFeedback}
          currentLetterIndex={currentLetterIndex}
          signedLetters={signedLetters}
          isDetecting={isDetecting}
          onExitQuiz={exitQuizMode}
          onSkipQuestion={skipQuizQuestion}
          onSimulateDetection={simulateQuizSignDetection}
          onCameraReady={onCameraReady}
        />
      );

    case 'speedPreview':
      return (
        <SpeedPreviewScreen
          quizQuestion={quizQuestion}
          typingScore={typingScore}
          currentWordIndex={currentWordIndex}
          typingWords={typingWords}
          userLevelSpeed={userLevelSpeed}
          typingTimer={typingTimer}
          onStartGame={startTypingGame}
          onGoBack={exitTypingMode}
        />
      );

    case 'speedGame':
      return (
        <SpeedGameScreen
          quizQuestion={quizQuestion}
          typingScore={typingScore}
          currentWordIndex={currentWordIndex}
          typingWords={typingWords}
          userLevelSpeed={userLevelSpeed}
          typingTimer={typingTimer}
          quizFeedback={quizFeedback}
          currentLetterIndex={currentLetterIndex}
          signedLetters={signedLetters}
          isDetecting={isDetecting}
          typingGameActive={typingGameActive}
          onExitTyping={exitTypingMode}
          onSkipWord={skipWord}
          onSimulateDetection={simulateSignDetection}
          onCameraReady={onCameraReady}
          onTimerEnd={handleTypingTimerEnd}
          onAllWordsCompleted={handleAllWordsCompleted}
        />
      );

    default:
      return (
        <GameSelectScreen
          onSelectMode={handleModeSelect}
          userStats={userStats}
        />
      );
  }
};

export default GameScreen;