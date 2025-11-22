import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { quizGame, speedGame } from '../utils/gameApi';
import { colors } from '../styles/colors';

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
  
  // Main navigation state
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'quiz', 'typing'
  
  // Camera permissions hook
  const [permission, requestPermission] = useCameraPermissions();
  
  // User levels
  const [userLevelQuiz, setUserLevelQuiz] = useState(1);
  const [userLevelSpeed, setUserLevelSpeed] = useState(1);
  
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
  const [cameraReady, setCameraReady] = useState(false);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [signedLetters, setSignedLetters] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const cameraRef = useRef(null);
  
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

  // Fetch user levels from Firestore
  useEffect(() => {
    const fetchUserLevels = async () => {
      if (user && user.id) {
        try {
          const userRef = doc(db, 'users', user.id);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserLevelQuiz(userData.levelQuiz || 1);
            setUserLevelSpeed(userData.levelSpeed || 1);
            console.log('User levels loaded:', {
              quiz: userData.levelQuiz,
              speed: userData.levelSpeed
            });
          }
        } catch (error) {
          console.error('Error fetching user levels:', error);
        }
      }
    };

    fetchUserLevels();
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
    // Call game API with user data
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
          
          setQuizWordsFromApi(wordsWithHints);
          console.log('Formatted quiz words:', JSON.stringify(wordsWithHints));
        } else {
          // Fallback to default word bank
          console.log('Using fallback word bank');
          setQuizWordsFromApi(FALLBACK_WORD_BANK);
        }
      } catch (error) {
        console.error('Error calling quiz API:', error);
        setQuizWordsFromApi(FALLBACK_WORD_BANK);
      }
    } else {
      console.log("No user logged in - using fallback")
      // No user logged in, use fallback
      setQuizWordsFromApi(FALLBACK_WORD_BANK);
    }
    
    // Navigate to quiz screen - no camera yet
    setCurrentScreen('quiz');
    setQuizScore(0);
    setQuizRound(0);
    setUsedQuizWords([]);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setCameraReady(false);
    setQuizGameActive(false);
    setQuizRevealWord(false);
    
    // Small delay to ensure state is set
    setTimeout(() => {
      generateQuizQuestion();
    }, 100);
  };

  const generateQuizQuestion = () => {
    // Use API words if available, otherwise fallback
    const wordBank = quizWordsFromApi.length > 0 ? quizWordsFromApi : FALLBACK_WORD_BANK;
    
    // Filter out already used words
    const availableWords = wordBank.filter(
      item => !usedQuizWords.includes(item.word)
    );
    
    if (availableWords.length === 0) {
      // Game completed - all words used
      setQuizFeedback('🎉 QUIZ COMPLETED! You finished all questions!');
      setQuizGameActive(false);
      updateQuizLevelInFirestore();
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

  const startQuizGame = async () => {
    console.log('Starting Quiz Game - requesting camera...');
    console.log('Permission status:', permission);
    
    // Check if we need to request camera permissions
    if (!permission) {
      Alert.alert(
        'Error',
        'Camera permissions are not initialized.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // If permission not granted, request it
    if (!permission.granted) {
      console.log('Requesting camera permission...');
      const result = await requestPermission();
      console.log('Permission result:', result);
      
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to play Quiz Mode.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // Permission granted, start the game
    console.log('Permission granted, starting quiz game...');
    setQuizGameActive(true);
    setQuizFeedback('');
    setCurrentLetterIndex(0);
    setSignedLetters([]);
  };

  const exitQuizMode = () => {
    setCurrentScreen('menu');
    setQuizQuestion(null);
    setQuizAnswer('');
    setQuizFeedback('');
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setCameraReady(false);
    setQuizGameActive(false);
    setQuizRevealWord(false);
  };

  const skipQuizQuestion = () => {
    setQuizRound(quizRound + 1);
    setQuizFeedback('⏭️ SKIPPED');
    setQuizGameActive(false);
    setTimeout(() => {
      generateQuizQuestion();
    }, 1000);
  };

  // Update quiz level in Firestore after completing all words
  const updateQuizLevelInFirestore = async () => {
    if (user && user.id) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          levelQuiz: increment(1),
          highScoreQuiz: quizScore > 0 ? quizScore : 0,
          gamesPlayed: increment(1)
        });
        console.log('✅ Quiz level updated in Firestore!');
        // Update local state
        setUserLevelQuiz(prev => prev + 1);
      } catch (error) {
        console.error('Error updating quiz level:', error);
      }
    }
  };

  // Simulate sign detection for Quiz Mode
  const simulateQuizSignDetection = () => {
    if (!quizQuestion || isDetecting || !quizGameActive) return;
    
    setIsDetecting(true);
    const currentLetter = quizQuestion.word[currentLetterIndex];
    
    // Simulate detection delay (500ms)
    setTimeout(() => {
      const newSignedLetters = [...signedLetters, currentLetter];
      setSignedLetters(newSignedLetters);
      setQuizFeedback(`✅ Detected: ${currentLetter}`);
      
      // Check if word is complete
      if (currentLetterIndex + 1 >= quizQuestion.word.length) {
        // Word completed!
        setQuizScore(quizScore + 10);
        setQuizFeedback('🎉 CORRECT! +10 points');
        setQuizRound(quizRound + 1);
        setQuizGameActive(false);
        
        setTimeout(() => {
          generateQuizQuestion();
        }, 2000);
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

  // ==================== TYPING SPEED RUN FUNCTIONS ====================
  
  const startTypingMode = async () => {
    // Call game API with user data
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
          
          setSpeedWordsFromApi(wordsForSpeed);
          setTypingTimer(apiResponse.totalTime || 30);
        } else {
          // Fallback to default word bank
          console.log('Using fallback word bank for speed game');
          const fallbackWords = FALLBACK_WORD_BANK.slice(0, 20).map(item => ({
            word: item.word,
            timeLimit: 10
          }));
          setSpeedWordsFromApi(fallbackWords);
          setTypingTimer(30);
        }
      } catch (error) {
        console.error('Error calling speed API:', error);
        const fallbackWords = FALLBACK_WORD_BANK.slice(0, 20).map(item => ({
          word: item.word,
          timeLimit: 10
        }));
        setSpeedWordsFromApi(fallbackWords);
        setTypingTimer(30);
      }
    } else {
      // No user logged in, use fallback
      const fallbackWords = FALLBACK_WORD_BANK.slice(0, 20).map(item => ({
        word: item.word,
        timeLimit: 10
      }));
      setSpeedWordsFromApi(fallbackWords);
      setTypingTimer(30);
    }
    
    // Navigate to typing screen - no camera yet
    setCurrentScreen('typing');
    setTypingScore(0);
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setCameraReady(false);
    setTypingGameActive(false);
    
    // Small delay to ensure state is set
    setTimeout(() => {
      // Use API words if available
      const words = speedWordsFromApi.length > 0 ? speedWordsFromApi : FALLBACK_WORD_BANK;
      setTypingWords(words);
      
      // Set first word as current question
      if (words.length > 0) {
        setQuizQuestion(words[0]);
      }
    }, 100);
  };

  const startTypingGame = async () => {
    console.log('Starting Typing Game - requesting camera...');
    console.log('Permission status:', permission);
    
    // Check if we need to request camera permissions
    if (!permission) {
      Alert.alert(
        'Error',
        'Camera permissions are not initialized.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // If permission not granted, request it
    if (!permission.granted) {
      console.log('Requesting camera permission...');
      const result = await requestPermission();
      console.log('Permission result:', result);
      
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to play SignSpeed.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // Permission granted, start the game
    console.log('Permission granted, starting typing game...');
    setTypingGameActive(true);
    setTypingStartTime(Date.now());
    setQuizFeedback('');
  };

  // Timer countdown
  useEffect(() => {
    if (typingGameActive && typingTimer > 0) {
      const interval = setInterval(() => {
        setTypingTimer(prev => {
          if (prev <= 1) {
            setTypingGameActive(false);
            updateSpeedLevelInFirestore();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [typingGameActive, typingTimer]);

  const exitTypingMode = () => {
    setCurrentScreen('menu');
    setTypingGameActive(false);
    setQuizQuestion(null);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setCameraReady(false);
  };

  const skipWord = () => {
    if (currentWordIndex < typingWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setCurrentLetterIndex(0);
      setSignedLetters([]);
      setQuizQuestion(typingWords[currentWordIndex + 1]);
      setQuizFeedback('⏭️ SKIPPED');
      setTimeout(() => {
        setQuizFeedback('');
      }, 1000);
    }
  };

  // Update speed level in Firestore after timer ends
  const updateSpeedLevelInFirestore = async () => {
    if (user && user.id) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          levelSpeed: increment(1),
          highScoreSpeed: typingScore > 0 ? typingScore : 0,
          gamesPlayed: increment(1)
        });
        console.log('✅ Speed level updated in Firestore!');
        // Update local state
        setUserLevelSpeed(prev => prev + 1);
      } catch (error) {
        console.error('Error updating speed level:', error);
      }
    }
  };

  // Simulate sign detection for SignSpeed mode
  const simulateSignDetection = () => {
    if (!quizQuestion || isDetecting || !typingGameActive) return;
    
    setIsDetecting(true);
    const currentLetter = quizQuestion.word[currentLetterIndex];
    
    // Simulate detection delay (500ms)
    setTimeout(() => {
      const newSignedLetters = [...signedLetters, currentLetter];
      setSignedLetters(newSignedLetters);
      setQuizFeedback(`✅ Detected: ${currentLetter}`);
      
      // Check if word is complete
      if (currentLetterIndex + 1 >= quizQuestion.word.length) {
        // Word completed!
        setTypingScore(typingScore + 1);
        setQuizFeedback('🎉 WORD COMPLETED! +1 point');
        
        setTimeout(() => {
          // Move to next word
          if (currentWordIndex < typingWords.length - 1) {
            setCurrentWordIndex(currentWordIndex + 1);
            setCurrentLetterIndex(0);
            setSignedLetters([]);
            setQuizQuestion(typingWords[currentWordIndex + 1]);
            setQuizFeedback('');
          } else {
            // Finished all words
            setTypingGameActive(false);
            setQuizFeedback('🎉 ALL WORDS COMPLETED!');
            updateSpeedLevelInFirestore();
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

  const onCameraReady = () => {
    console.log('Camera is ready!');
    setCameraReady(true);
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderMenu = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>GAME ZONE</Text>
        <Text style={styles.subtitle}>
          Choose your challenge and start playing!
        </Text>
      </View>

      {/* Quiz Mode Card */}
      <TouchableOpacity
        style={[styles.modeCard, { backgroundColor: colors.brutalBlue }]}
        activeOpacity={0.9}
        onPress={startQuizMode}
      >
        <View style={styles.modeIcon}>
          <Text style={styles.modeIconText}>❓</Text>
        </View>
        <Text style={styles.modeTitle}>QUIZ MODE</Text>
        <Text style={styles.modeDescription}>
          Guess the word from a hint! Sign using ASL to spell your answer letter by letter.
        </Text>
      </TouchableOpacity>

      {/* SignSpeed Card */}
      <TouchableOpacity
        style={[styles.modeCard, { backgroundColor: colors.brutalGreen }]}
        activeOpacity={0.9}
        onPress={startTypingMode}
      >
        <View style={styles.modeIcon}>
          <Text style={styles.modeIconText}>⚡</Text>
        </View>
        <Text style={styles.modeTitle}>SIGNSPEED</Text>
        <Text style={styles.modeDescription}>
          Race against time! Sign words as fast as you can. Beat the 30-second timer and maximize your score.
        </Text>
      </TouchableOpacity>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>YOUR STATS</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Quiz High Score:</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Best WPM:</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Games Played:</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderQuizMode = () => {
    if (!quizQuestion) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      );
    }

    // Show intro screen without camera if game hasn't started
    if (!quizGameActive) {
      return (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.gameHeader}>
            <TouchableOpacity style={styles.backButton} onPress={exitQuizMode}>
              <Text style={styles.backButtonText}>← BACK</Text>
            </TouchableOpacity>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{quizScore}</Text>
            </View>
          </View>

          <Text style={styles.gameTitle}>QUIZ MODE</Text>
          <Text style={styles.gameSubtitle}>Round {quizRound + 1}</Text>

          {/* Mode Description Card */}
          <View style={[styles.quizCard, { backgroundColor: colors.brutalBlue, marginBottom: 20 }]}>
            <Text style={[styles.quizCardLabel, { color: colors.brutalWhite }]}>❓ ABOUT QUIZ MODE</Text>
            <Text style={[styles.instructionText, { color: colors.brutalWhite, marginTop: 8 }]}>
              • Read the hint below{'\n'}
              • Guess the word{'\n'}
              • Use ASL to sign each letter{'\n'}
              • The word reveals as you sign!
            </Text>
          </View>

          {/* Hint Card */}
          <View style={[styles.quizCard, { backgroundColor: colors.brutalYellow, marginBottom: 20 }]}>
            <Text style={styles.quizCardLabel}>💡 YOUR HINT</Text>
            <Text style={styles.quizHint}>{quizQuestion.hint}</Text>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.brutalBlue }]}
            onPress={startQuizGame}
            activeOpacity={0.9}
          >
            <Text style={styles.submitButtonText}>START</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // Game is active - show camera view
    if (!permission) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Camera permission is required</Text>
          <Text style={styles.loadingSubtext}>
            Please grant camera access to use Quiz Mode
          </Text>
          <TouchableOpacity 
            style={[styles.submitButton, { marginTop: 20 }]} 
            onPress={async () => {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert(
                  'Permission Denied',
                  'Camera access is required for Quiz Mode. Please enable it in your device settings.',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            <Text style={styles.submitButtonText}>REQUEST PERMISSION</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: colors.brutalWhite, marginTop: 12 }]} 
            onPress={exitQuizMode}
          >
            <Text style={[styles.submitButtonText, { color: colors.brutalBlack }]}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.quizFullScreen}>
        {/* Camera View at Top (60% of screen) */}
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            onCameraReady={onCameraReady}
            onMountError={(error) => {
              console.error('Camera mount error:', error);
              Alert.alert('Camera Error', `Failed to start camera: ${error.message}`);
            }}
          >
            {/* Top Bar Overlay on Camera */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.topButton} onPress={exitQuizMode}>
                <Text style={styles.topButtonText}>← BACK</Text>
              </TouchableOpacity>
              
              <View style={styles.topCenter}>
                <Text style={styles.topScoreLabel}>SCORE: {quizScore}</Text>
                <Text style={styles.topRoundLabel}>Round {quizRound + 1}</Text>
              </View>
              
              <TouchableOpacity style={styles.topButton} onPress={skipQuizQuestion}>
                <Text style={styles.topButtonText}>SKIP →</Text>
              </TouchableOpacity>
            </View>

            {/* Camera Ready Indicator */}
            {!cameraReady && (
              <View style={styles.cameraLoadingOverlay}>
                <Text style={styles.cameraLoadingText}>📷 Starting camera...</Text>
              </View>
            )}

            {/* Feedback Message Overlay on Camera */}
            {quizFeedback && (
              <View style={styles.feedbackOverlayCenter}>
                <View
                  style={[
                    styles.feedbackCard,
                    {
                      backgroundColor:
                        quizFeedback.includes('✅') || quizFeedback.includes('🎉')
                          ? colors.brutalGreen
                          : quizFeedback.includes('⏭️')
                          ? colors.brutalYellow
                          : colors.brutalRed,
                    },
                  ]}
                >
                  <Text style={styles.feedbackOverlayText}>{quizFeedback}</Text>
                </View>
              </View>
            )}
          </CameraView>
        </View>

        {/* Bottom Content Area (40% of screen) */}
        <View style={styles.bottomContentArea}>
          {/* Hint Card - Always Visible */}
          <View style={[styles.quizCard, { backgroundColor: colors.brutalYellow, marginBottom: 8, paddingVertical: 12 }]}>
            <Text style={styles.quizCardLabel}>💡 HINT</Text>
            <Text style={styles.quizHint}>{quizQuestion.hint}</Text>
          </View>

          {/* Word Progress - Show only guessed letters, rest are hidden */}
          <View style={styles.wordProgressContainerBottom}>
            <Text style={[styles.wordProgressLabelBottom, { fontSize: 14, marginBottom: 8 }]}>WORD PROGRESS:</Text>
            <View style={styles.wordDisplay}>
              {quizQuestion.word.split('').map((letter, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.letterDisplayBox,
                    idx < currentLetterIndex && styles.letterDisplayBoxCompleted,
                    idx === currentLetterIndex && styles.letterDisplayBoxCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.letterDisplayText,
                      idx < currentLetterIndex && styles.letterDisplayTextCompleted,
                      idx === currentLetterIndex && styles.letterDisplayTextCurrent,
                    ]}
                  >
                    {idx < currentLetterIndex ? letter : '_'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Current Letter to Sign - Compact Version */}
          {currentLetterIndex < quizQuestion.word.length && (
            <View style={[styles.currentSignPromptBottom, { paddingVertical: 8, marginVertical: 8 }]}>
              <Text style={[styles.currentSignLabelBottom, { fontSize: 14, marginBottom: 4 }]}>
                {currentLetterIndex === 0 ? 'SIGN THE FIRST LETTER' : 'NEXT LETTER'}
              </Text>
              <Text style={[styles.currentSignLetterBottom, { fontSize: 32 }]}>?</Text>
            </View>
          )}

          {/* Test Button */}
          <TouchableOpacity
            style={[
              styles.detectButtonBottom,
              isDetecting && styles.detectButtonDisabled,
            ]}
            onPress={simulateQuizSignDetection}
            disabled={isDetecting}
            activeOpacity={0.9}
          >
            <Text style={styles.detectButtonText}>
              {isDetecting ? 'DETECTING...' : '🤚 TEST: DETECT SIGN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTypingMode = () => {
    if (!quizQuestion) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading words...</Text>
        </View>
      );
    }

    // Show intro screen without camera if game hasn't started
    if (!typingGameActive) {
      return (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.gameHeader}>
            <TouchableOpacity style={styles.backButton} onPress={exitTypingMode}>
              <Text style={styles.backButtonText}>← BACK</Text>
            </TouchableOpacity>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{typingScore}</Text>
            </View>
          </View>

          <Text style={styles.gameTitle}>SIGNSPEED</Text>
          <Text style={styles.gameSubtitle}>Word {currentWordIndex + 1}/{typingWords.length}</Text>

          {/* Mode Description Card */}
          <View style={[styles.quizCard, { backgroundColor: colors.brutalGreen, marginBottom: 20 }]}>
            <Text style={[styles.quizCardLabel, { color: colors.brutalWhite }]}>⚡ ABOUT SIGNSPEED</Text>
            <Text style={[styles.instructionText, { color: colors.brutalWhite, marginTop: 8 }]}>
              • Race against the 30-second timer{'\n'}
              • Sign each word letter by letter{'\n'}
              • Letters and words are shown{'\n'}
              • Complete as many words as you can!
            </Text>
          </View>

          {/* Timer Info Card */}
          <View style={[styles.quizCard, { backgroundColor: colors.brutalYellow, marginBottom: 20 }]}>
            <Text style={styles.quizCardLabel}>⏱️ TIMER</Text>
            <Text style={[styles.quizLetterCount, { fontSize: 48 }]}>30 seconds</Text>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.brutalGreen }]}
            onPress={startTypingGame}
            activeOpacity={0.9}
          >
            <Text style={styles.submitButtonText}>START</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // Game is active - show camera view
    if (!permission) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Camera permission is required</Text>
          <Text style={styles.loadingSubtext}>
            Please grant camera access to use SignSpeed
          </Text>
          <TouchableOpacity 
            style={[styles.submitButton, { marginTop: 20 }]} 
            onPress={async () => {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert(
                  'Permission Denied',
                  'Camera access is required for SignSpeed. Please enable it in your device settings.',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            <Text style={styles.submitButtonText}>REQUEST PERMISSION</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: colors.brutalWhite, marginTop: 12 }]} 
            onPress={exitTypingMode}
          >
            <Text style={[styles.submitButtonText, { color: colors.brutalBlack }]}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.quizFullScreen}>
        {/* Camera View at Top (60% of screen) */}
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            onCameraReady={onCameraReady}
            onMountError={(error) => {
              console.error('Camera mount error:', error);
              Alert.alert('Camera Error', `Failed to start camera: ${error.message}`);
            }}
          >
            {/* Top Bar Overlay on Camera */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.topButton} onPress={exitTypingMode}>
                <Text style={styles.topButtonText}>← BACK</Text>
              </TouchableOpacity>
              
              <View style={styles.topCenter}>
                <Text style={styles.topScoreLabel}>⏱️ {typingTimer}s</Text>
                <Text style={styles.topRoundLabel}>Word {currentWordIndex + 1}/{typingWords.length}</Text>
              </View>
              
              <TouchableOpacity style={styles.topButton} onPress={skipWord}>
                <Text style={styles.topButtonText}>SKIP →</Text>
              </TouchableOpacity>
            </View>

            {/* Camera Ready Indicator */}
            {!cameraReady && (
              <View style={styles.cameraLoadingOverlay}>
                <Text style={styles.cameraLoadingText}>📷 Starting camera...</Text>
              </View>
            )}

            {/* Feedback Message Overlay on Camera */}
            {quizFeedback && (
              <View style={styles.feedbackOverlayCenter}>
                <View
                  style={[
                    styles.feedbackCard,
                    {
                      backgroundColor:
                        quizFeedback.includes('✅') || quizFeedback.includes('🎉')
                          ? colors.brutalGreen
                          : quizFeedback.includes('⏭️')
                          ? colors.brutalYellow
                          : colors.brutalRed,
                    },
                  ]}
                >
                  <Text style={styles.feedbackOverlayText}>{quizFeedback}</Text>
                </View>
              </View>
            )}
          </CameraView>
        </View>

        {/* Bottom Content Area (40% of screen) */}
        <View style={styles.bottomContentArea}>
          {/* Timer Display */}
          <View style={[styles.quizCard, { backgroundColor: typingTimer > 10 ? colors.brutalGreen : colors.brutalRed, marginBottom: 12 }]}>
            <Text style={[styles.quizCardLabel, { color: colors.brutalWhite }]}>⏱️ TIME REMAINING</Text>
            <Text style={[styles.quizLetterCount, { color: colors.brutalWhite, fontSize: 48 }]}>
              {typingTimer}s
            </Text>
          </View>

          {/* Current Word Display - Large */}
          <View style={styles.wordProgressContainerBottom}>
            <Text style={styles.wordProgressLabelBottom}>CURRENT WORD:</Text>
            <View style={styles.wordDisplay}>
              {quizQuestion.word.split('').map((letter, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.letterDisplayBox,
                    idx < currentLetterIndex && styles.letterDisplayBoxCompleted,
                    idx === currentLetterIndex && styles.letterDisplayBoxCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.letterDisplayText,
                      idx < currentLetterIndex && styles.letterDisplayTextCompleted,
                      idx === currentLetterIndex && styles.letterDisplayTextCurrent,
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Current Letter to Sign - Large Display */}
          {currentLetterIndex < quizQuestion.word.length && (
            <View style={styles.currentSignPromptBottom}>
              <Text style={styles.currentSignLabelBottom}>SIGN THIS LETTER:</Text>
              <Text style={styles.currentSignLetterBottom}>
                {quizQuestion.word[currentLetterIndex]}
              </Text>
            </View>
          )}

          {/* Test Button */}
          <TouchableOpacity
            style={[
              styles.detectButtonBottom,
              isDetecting && styles.detectButtonDisabled,
            ]}
            onPress={simulateSignDetection}
            disabled={isDetecting}
            activeOpacity={0.9}
          >
            <Text style={styles.detectButtonText}>
              {isDetecting ? 'DETECTING...' : '🤚 TEST: DETECT SIGN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'menu' && renderMenu()}
      {currentScreen === 'quiz' && renderQuizMode()}
      {currentScreen === 'typing' && renderTypingMode()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  
  // ==================== HEADER STYLES ====================
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.brutalBlack,
    marginTop: 8,
  },
  
  // ==================== MODE SELECTION CARDS ====================
  modeCard: {
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  modeIcon: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  modeIconText: {
    fontSize: 48,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    marginBottom: 12,
    letterSpacing: 1,
  },
  modeDescription: {
    fontSize: 14,
    color: colors.brutalWhite,
    lineHeight: 20,
    marginBottom: 16,
  },
  modeBadge: {
    backgroundColor: colors.brutalBlack,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  modeBadgeText: {
    color: colors.brutalWhite,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  // ==================== STATS CARD ====================
  statsCard: {
    backgroundColor: colors.brutalGray,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 16,
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  
  // ==================== GAME HEADER ====================
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  scoreContainer: {
    backgroundColor: colors.brutalYellow,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 8,
    letterSpacing: 1,
  },
  gameSubtitle: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: colors.brutalBlack,
    marginBottom: 24,
  },
  
  // ==================== QUIZ MODE STYLES ====================
  quizContainer: {
    marginBottom: 20,
  },
  quizCard: {
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  quizCardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 8,
    letterSpacing: 1,
  },
  quizHint: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  quizLetterCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 12,
  },
  letterBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  letterBox: {
    width: 40,
    height: 50,
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    marginHorizontal: 4,
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  answerSection: {
    marginBottom: 16,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 8,
    letterSpacing: 1,
  },
  answerInput: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  feedbackCard: {
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.brutalBlue,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    paddingVertical: 16,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
    letterSpacing: 1,
  },
  
  // ==================== TYPING MODE STYLES ====================
  typingContainer: {
    flex: 1,
    padding: 20,
  },
  typingStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBadge: {
    flex: 1,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  statBadgeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 4,
  },
  statBadgeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  typingInstructions: {
    backgroundColor: colors.brutalGray,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 24,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 16,
    letterSpacing: 1,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.brutalBlack,
    lineHeight: 24,
    marginBottom: 20,
  },
  typingPlayArea: {
    flex: 1,
  },
  currentWordCard: {
    backgroundColor: colors.brutalBlue,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  currentWordLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    marginBottom: 12,
    letterSpacing: 2,
  },
  currentWord: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    letterSpacing: 4,
  },
  typingInputSection: {
    marginBottom: 24,
  },
  typingInput: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  progressBar: {
    height: 20,
    backgroundColor: colors.brutalGray,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    marginTop: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brutalBlue,
  },
  gameOverCard: {
    backgroundColor: colors.brutalYellow,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 32,
    alignItems: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 16,
  },
  gameOverScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 8,
  },
  gameOverWPM: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  
  // ==================== ASL CAMERA STYLES ====================
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.brutalWhite,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.brutalBlack,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  quizFullScreen: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
  },
  cameraContainer: {
    flex: 0.6,
    borderBottomWidth: 4,
    borderBottomColor: colors.brutalBlack,
  },
  camera: {
    flex: 1,
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  topButton: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  topButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  topCenter: {
    alignItems: 'center',
  },
  topScoreLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    backgroundColor: colors.brutalBlue,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
  },
  topRoundLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    marginTop: 4,
  },
  
  // Feedback on Camera
  feedbackOverlayCenter: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCard: {
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 20,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    width: '100%',
  },
  
  // Camera Loading Overlay
  cameraLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLoadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalWhite,
  },
  
  // Bottom Content Area
  bottomContentArea: {
    flex: 0.4,
    backgroundColor: colors.brutalWhite,
    padding: 16,
  },
  
  // Current Letter Display - Bottom
  currentSignPromptBottom: {
    backgroundColor: colors.brutalPurple,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  currentSignLabelBottom: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    marginBottom: 4,
    letterSpacing: 1,
  },
  currentSignLetterBottom: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    letterSpacing: 2,
  },
  
  // Word Progress - Bottom
  wordProgressContainerBottom: {
    marginBottom: 12,
  },
  wordProgressLabelBottom: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 12,
    letterSpacing: 1,
  },
  wordDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  letterDisplayBox: {
    width: 50,
    height: 60,
    backgroundColor: colors.brutalWhite,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    marginHorizontal: 4,
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  letterDisplayBoxCompleted: {
    backgroundColor: colors.brutalGreen,
  },
  letterDisplayBoxCurrent: {
    backgroundColor: colors.brutalYellow,
    borderWidth: 5,
  },
  letterDisplayText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  letterDisplayTextCompleted: {
    color: colors.brutalWhite,
  },
  letterDisplayTextCurrent: {
    color: colors.brutalBlack,
  },
  
  // Test Button - Bottom
  detectButtonBottom: {
    backgroundColor: colors.brutalBlue,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  detectButtonDisabled: {
    backgroundColor: colors.brutalGray,
    opacity: 0.7,
  },
  detectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
    letterSpacing: 1,
  },
  feedbackOverlayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
  },
});

export default GameScreen;