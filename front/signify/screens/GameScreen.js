import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { updateLetterStats } from '../utils/gameApi';
import {
  fetchQuizWords as quizGame,
  fetchWordModeWords as wordGame,
  fetchSpeedWords as speedGame
} from '../utils/gameApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeWordDetection } from '../services/wordDetection';

// Import screens
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
];

const GameScreen = ({ user, userStats, onBackPress, onCameraReady }) => {
  const [currentScreen, setCurrentScreen] = useState('select');

  // ====================  SHARED STATE ====================
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [signedLetters, setSignedLetters] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState('');

  // ==================== QUIZ STATES ====================
  const [quizScore, setQuizScore] = useState(0);
  const [quizRound, setQuizRound] = useState(0);
  const [userLevelQuiz, setUserLevelQuiz] = useState(userStats?.levelQuiz || 1);
  const [quizGameActive, setQuizGameActive] = useState(false);
  const [quizWordsFromApi, setQuizWordsFromApi] = useState([]);
  const [usedQuizWords, setUsedQuizWords] = useState([]);
  const [quizRevealWord, setQuizRevealWord] = useState(false);

  // ==================== TYPING SPEED STATES ====================
  const [typingScore, setTypingScore] = useState(0);
  const [typingWords, setTypingWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userLevelSpeed, setUserLevelSpeed] = useState(userStats?.levelSpeed || 1);
  const [typingGameActive, setTypingGameActive] = useState(false);
  const [typingTimer, setTypingTimer] = useState(30); // default timer
  const [typingStartTime, setTypingStartTime] = useState(null);
  const [speedWordsFromApi, setSpeedWordsFromApi] = useState([]);

  // ==================== WORD MODE DETECTION ====================
  const [wordDetectionService, setWordDetectionService] = useState(null);
  const [isWordMode, setIsWordMode] = useState(false);

  // Initialize word detection service on mount
  useEffect(() => {
    const setupWordDetection = async () => {
      const service = await initializeWordDetection();
      setWordDetectionService(service);
    };
    setupWordDetection();
  }, []);

  // Mode selection handler
  const handleModeSelect = (mode) => {
    if (mode === 'quiz') {
      startQuizMode();
    } else if (mode === 'speed') {
      startTypingMode();
    } else if (mode === 'word') {
      startWordMode();
    }
  };

  // ==================== QUIZ MODE FUNCTIONS ====================

  const generateQuizQuestion = () => {
    const wordBank = quizWordsFromApi.length > 0 ? quizWordsFromApi : FALLBACK_WORD_BANK;

    // Filter out already used words
    const availableWords = wordBank.filter(
      item => !usedQuizWords.includes(item.word)
    );

    if (availableWords.length === 0) {
      // All words in this level have been used
      setQuizGameActive(false);
      setQuizFeedback('[SUCCESS] LEVEL COMPLETED! Well done!');
      // Update level in Firestore
      updateQuizLevelInFirestore();
      return;
    }

    // Pick a random word from available words
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const selectedWord = availableWords[randomIndex];

    console.log('Generated quiz question:', selectedWord);
    setQuizQuestion(selectedWord);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizRevealWord(false);
    setUsedQuizWords([...usedQuizWords, selectedWord.word]);
  };

  const startQuizMode = async () => {
    console.log('Starting quiz mode for user level:', userStats?.levelQuiz || 1);

    // Navigate to preview screen immediately for instant transition
    setCurrentScreen('quizPreview');
    setQuizScore(0);
    setQuizRound(0);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizGameActive(false);
    setQuizRevealWord(false);
    setUsedQuizWords([]);

    // Set user level from stats
    const currentLevel = userStats?.levelQuiz || 1;
    setUserLevelQuiz(currentLevel);

    let wordsToUse = FALLBACK_WORD_BANK;

    // Call game API with user data (after navigation for perceived speed)
    if (user && user.id) {
      try {
        console.log('Calling quizGame API...');
        const apiResponse = await quizGame(user.id, currentLevel);
        console.log('Quiz API Response:', apiResponse);

        if (apiResponse.success && apiResponse.words && apiResponse.words.length > 0) {
          console.log('Quiz game data from API:', apiResponse);
          console.log('Words with hints:', apiResponse.words);

          // Use words from API
          wordsToUse = apiResponse.words.map(item => ({
            word: item.word.toUpperCase(),
            hint: item.hint || 'No hint available'
          }));

          console.log('Using words from API for quiz:', JSON.stringify(wordsToUse));
        } else {
          // Fallback to default word bank
          console.log('Using fallback word bank for quiz');
          wordsToUse = FALLBACK_WORD_BANK.slice(0, 5);
        }
      } catch (error) {
        console.error('Error calling quiz API:', error);
        // Use fallback on error
        wordsToUse = FALLBACK_WORD_BANK.slice(0, 5);
      }
    } else {
      console.log('No user logged in - using fallback for quiz');
      wordsToUse = FALLBACK_WORD_BANK.slice(0, 5);
    }

    // Set the API words in state
    setQuizWordsFromApi(wordsToUse);

    // Set first word immediately with the words we just fetched
    if (wordsToUse.length > 0) {
      const firstWord = wordsToUse[0];
      setQuizQuestion(firstWord);
      setUsedQuizWords([firstWord.word]);
      console.log('First quiz word set:', firstWord);
    }
  };

  // ==================== WORD MODE FUNCTIONS ====================

  const startWordMode = async () => {
    console.log('Starting word detection mode for user level:', userStats?.levelQuiz || 1);

    // Set word mode flag
    await AsyncStorage.setItem('detectionMode', 'word');
    setIsWordMode(true);

    // Navigate to preview screen
    setCurrentScreen('quizPreview');
    setQuizScore(0);
    setQuizRound(0);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizGameActive(false);
    setQuizRevealWord(false);
    setUsedQuizWords([]);

    // Set user level from stats
    const currentLevel = userStats?.levelQuiz || 1;
    setUserLevelQuiz(currentLevel);

    let wordsToUse = FALLBACK_WORD_BANK;

    // Call word mode API with user data
    if (user && user.id) {
      try {
        console.log('Calling wordGame API for word mode...');
        const apiResponse = await wordGame(user.id, currentLevel);
        console.log('Word Mode API Response:', apiResponse);

        if (apiResponse.success && apiResponse.words && apiResponse.words.length > 0) {
          console.log('Word mode data from API:', apiResponse);

          // Use words from API
          wordsToUse = apiResponse.words.map(item => ({
            word: item.word.toUpperCase(),
            hint: item.hint || 'Sign the complete word'
          }));

          console.log('Using words from API for word mode:', JSON.stringify(wordsToUse));
        } else {
          // Fallback to default word bank
          console.log('Using fallback word bank for word mode');
          wordsToUse = FALLBACK_WORD_BANK.slice(0, 5);
        }
      } catch (error) {
        console.error('Error calling word mode API:', error);
        // Use fallback on error
        wordsToUse = FALLBACK_WORD_BANK.slice(0, 5);
      }
    } else {
      console.log('No user logged in - using fallback for word mode');
      wordsToUse = FALLBACK_WORD_BANK.slice(0, 5);
    }

    // Set the API words in state
    setQuizWordsFromApi(wordsToUse);

    // Set first word
    if (wordsToUse.length > 0) {
      const firstWord = wordsToUse[0];
      setQuizQuestion(firstWord);
      setUsedQuizWords([firstWord.word]);
      console.log('First word mode word set:', firstWord);
    }
  };

  const startQuizGame = () => {
    console.log('Starting quiz game...');
    setQuizGameActive(true);
    setQuizFeedback('');
    // Don't generate new question - keep the one from preview
  };

  const exitQuizMode = async () => {
    console.log('Exiting quiz mode...');

    // Reset word mode flag
    await AsyncStorage.setItem('detectionMode', 'letter');
    setIsWordMode(false);

    // Navigate back to game selection
    setCurrentScreen('select');

    // Reset all quiz states
    setQuizScore(0);
    setQuizRound(0);
    setQuizQuestion(null);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizGameActive(false);
    setQuizRevealWord(false);
  };

  const skipQuizQuestion = async () => {
    // Check detection mode from storage
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word';

    if (isWordMode) {
      // Word mode: Skip the entire word
      setQuizRound(quizRound + 1);
      setQuizFeedback('[SKIP] WORD SKIPPED');

      // Track all letters in the word as skipped
      if (quizQuestion && user?.id) {
        for (let letter of quizQuestion.word) {
          await updateLetterStats(user.id, letter, 'skip');
        }
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
    } else {
      // Letter mode: Skip just the current letter
      if (quizQuestion && currentLetterIndex < quizQuestion.word.length) {
        const skippedLetter = quizQuestion.word[currentLetterIndex];
        console.log(`Skipping letter: ${skippedLetter} at index ${currentLetterIndex}`);

        // Track the skipped letter as a struggle
        if (user?.id) {
          await updateLetterStats(user.id, skippedLetter, 'skip');
        }

        // Add a placeholder for the skipped letter
        const newSignedLetters = [...signedLetters, '_'];
        setSignedLetters(newSignedLetters);
        setQuizFeedback(`[SKIP] Skipped letter: ${skippedLetter}`);

        // Check if this was the last letter in the word
        if (currentLetterIndex + 1 >= quizQuestion.word.length) {
          // Word is complete (but with skipped letters)
          setCurrentLetterIndex(currentLetterIndex + 1);
          setQuizRound(quizRound + 1);

          setTimeout(() => {
            setQuizFeedback('Word completed with skips. Next word...');
            generateQuizQuestion();
          }, 1500);
        } else {
          // Move to next letter in the same word
          setCurrentLetterIndex(currentLetterIndex + 1);

          setTimeout(() => {
            setQuizFeedback('');
          }, 1000);
        }
      }
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
        setUserLevelQuiz(userLevelQuiz + 1);
      } catch (error) {
        console.error('Error updating quiz level in Firestore:', error);
      }
    }
  };

  // Handle actual letter detection for Quiz Mode
  const handleQuizLetterDetected = async (detectedLetter) => {
    if (!quizQuestion || !quizGameActive) return;

    // Don't check isDetecting here - allow immediate detection

    // Check if the detected letter matches the expected letter
    const expectedLetter = quizQuestion.word[currentLetterIndex];
    if (detectedLetter !== expectedLetter) {
      console.log(`Letter mismatch: expected ${expectedLetter}, got ${detectedLetter}`);
      return;
    }

    console.log(`Correct letter detected: ${detectedLetter} at index ${currentLetterIndex}`);

    // Add the detected letter to signed letters
    const newSignedLetters = [...signedLetters, detectedLetter];
    setSignedLetters(newSignedLetters);
    setQuizFeedback(`✓ Detected: ${detectedLetter}`);

    // Track successful letter detection
    if (user?.id) {
      await updateLetterStats(user.id, detectedLetter, 'success');
    }

    // Check if word is complete
    if (currentLetterIndex + 1 >= quizQuestion.word.length) {
      // Word completed!
      setCurrentLetterIndex(currentLetterIndex + 1);
      setQuizScore(quizScore + 10);
      setQuizFeedback('✅ CORRECT! +10 points');
      setQuizRound(quizRound + 1);

      setTimeout(() => {
        generateQuizQuestion();
        setCurrentLetterIndex(0);
        setSignedLetters([]);
        setQuizFeedback('');
      }, 1500);
    } else {
      // Move to next letter immediately
      setCurrentLetterIndex(currentLetterIndex + 1);
      setTimeout(() => {
        setQuizFeedback('');
      }, 1000);
    }
  };

  // Simulate sign detection for Quiz Mode
  const simulateQuizSignDetection = async () => {
    if (!quizQuestion || isDetecting || !quizGameActive) return;

    setIsDetecting(true);

    // Check detection mode from storage
    const savedMode = await AsyncStorage.getItem('detectionMode');
    const isWordMode = savedMode === 'word';

    setTimeout(() => {
      if (isWordMode) {
        // Word mode: Complete the entire word
        const fullWord = quizQuestion.word;
        const completedLetters = fullWord.split('');
        setSignedLetters(completedLetters);
        setCurrentLetterIndex(fullWord.length);
        setQuizFeedback('[SUCCESS] WORD DETECTED! +10 points');
        setQuizScore(quizScore + 10);
        setQuizRound(quizRound + 1);

        // Track all letters as successful
        if (user?.id) {
          completedLetters.forEach(letter => {
            updateLetterStats(user.id, letter, 'success');
          });
        }

        // Generate new question after delay
        setTimeout(() => {
          generateQuizQuestion();
        }, 2000);
      } else {
        // Letter mode: Complete current letter
        const currentLetter = quizQuestion.word[currentLetterIndex];
        const newSignedLetters = [...signedLetters, currentLetter];
        setSignedLetters(newSignedLetters);

        setQuizFeedback(`[CHECK] ✓ Detected: ${currentLetter}`);

        // Track successful letter detection
        if (user?.id) {
          updateLetterStats(user.id, currentLetter, 'success');
        }

        // Check if word is complete
        if (currentLetterIndex + 1 >= quizQuestion.word.length) {
          // Word completed!
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
  };

  const exitTypingMode = () => {
    console.log('Exiting typing mode...');

    // Navigate back to game selection
    setCurrentScreen('select');

    // Reset all typing states
    setTypingScore(0);
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setQuizQuestion(null);
    setTypingGameActive(false);
    setTypingTimer(30);
    setTypingStartTime(null);
  };

  const skipWord = async () => {
    // Track the current word's letters as skipped
    if (quizQuestion && user?.id) {
      for (let i = currentLetterIndex; i < quizQuestion.word.length; i++) {
        const skippedLetter = quizQuestion.word[i];
        await updateLetterStats(user.id, skippedLetter, 'skip');
      }
    }

    if (currentWordIndex < typingWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setCurrentLetterIndex(0);
      setSignedLetters([]);
      setQuizQuestion(typingWords[currentWordIndex + 1]);
      setQuizFeedback('[SKIP] Word skipped');

      setTimeout(() => {
        setQuizFeedback('');
      }, 1000);
    } else {
      // No more words
      handleAllWordsCompleted();
    }
  };

  const handleTypingTimerEnd = () => {
    console.log('Timer ended!');
    setTypingGameActive(false);
    setQuizFeedback('TIME\'S UP!');

    // Update Firestore with final score
    updateSpeedLevelInFirestore();
  };

  const handleAllWordsCompleted = () => {
    console.log('All words completed!');
    setTypingGameActive(false);
    setQuizFeedback('ALL WORDS COMPLETED! 🎉');

    // Calculate bonus for completing all words
    const bonusPoints = 50 + (userLevelSpeed * 10);
    setTypingScore(typingScore + bonusPoints);

    // Update Firestore with level completion
    updateSpeedLevelInFirestore();
  };

  const updateSpeedLevelInFirestore = async () => {
    if (user && user.id) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          levelSpeed: increment(1),
          highScoreSpeed: typingScore > userStats.speedHighScore ? typingScore : userStats.speedHighScore,
          gamesPlayed: increment(1)
        });
        console.log(' Speed level updated in Firestore!');
        setUserLevelSpeed(userLevelSpeed + 1);
      } catch (error) {
        console.error('Error updating speed level in Firestore:', error);
      }
    }
  };

  // Handle actual letter detection for Speed Mode
  const handleSpeedLetterDetected = async (detectedLetter) => {
    if (!quizQuestion || !typingGameActive) return;

    // Don't check isDetecting here - allow immediate detection

    // Check if the detected letter matches the expected letter
    const expectedLetter = quizQuestion.word[currentLetterIndex];
    if (detectedLetter !== expectedLetter) {
      console.log(`Speed: Letter mismatch: expected ${expectedLetter}, got ${detectedLetter}`);
      return;
    }

    console.log(`Speed: Correct letter detected: ${detectedLetter} at index ${currentLetterIndex}`);

    // Add the detected letter to signed letters
    const newSignedLetters = [...signedLetters, detectedLetter];
    setSignedLetters(newSignedLetters);
    setQuizFeedback(`✓ Detected: ${detectedLetter}`);

    // Track successful letter detection
    if (user?.id) {
      await updateLetterStats(user.id, detectedLetter, 'success');
    }

    // Check if word is complete
    if (currentLetterIndex + 1 >= quizQuestion.word.length) {
      // Word completed!
      setCurrentLetterIndex(currentLetterIndex + 1);
      // Calculate points based on level (10 points base + 5 per level)
      const pointsEarned = 10 + (userLevelSpeed * 5);
      setTypingScore(typingScore + pointsEarned);
      setQuizFeedback(`✅ WORD COMPLETED! +${pointsEarned} points`);

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
      // Move to next letter immediately
      setCurrentLetterIndex(currentLetterIndex + 1);
      setTimeout(() => {
        setQuizFeedback('');
      }, 1000);
    }
  };

  // Simulate sign detection for SignSpeed mode
  const simulateSignDetection = async () => {
    if (!quizQuestion || isDetecting || !typingGameActive) return;

    setIsDetecting(true);

    setTimeout(() => {
      const currentLetter = quizQuestion.word[currentLetterIndex];
      const newSignedLetters = [...signedLetters, currentLetter];
      setSignedLetters(newSignedLetters);

      setQuizFeedback(`✓ Detected: ${currentLetter}`);

      // Track successful letter detection
      if (user?.id) {
        updateLetterStats(user.id, currentLetter, 'success');
      }

      // Check if word is complete
      if (currentLetterIndex + 1 >= quizQuestion.word.length) {
        // Word completed!
        setCurrentLetterIndex(currentLetterIndex + 1);

        // Calculate points based on level (10 points base + 5 per level)
        const pointsEarned = 10 + (userLevelSpeed * 5);
        setTypingScore(typingScore + pointsEarned);
        setQuizFeedback(`✅ WORD COMPLETED! +${pointsEarned} points`);

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

      setIsDetecting(false);
    }, 500);
  };

  // ==================== RENDER SCREENS ====================

  switch (currentScreen) {
    case 'select':
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
          onLetterDetected={handleQuizLetterDetected}
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
          currentLetterIndex={currentLetterIndex}
          signedLetters={signedLetters}
          typingTimer={typingTimer}
          typingStartTime={typingStartTime}
          isDetecting={isDetecting}
          typingGameActive={typingGameActive}
          onExitTyping={exitTypingMode}
          onSkipWord={skipWord}
          onSimulateDetection={simulateSignDetection}
          onLetterDetected={handleSpeedLetterDetected}
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