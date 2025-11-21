import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../styles/colors';

// Sample word bank for games
const WORD_BANK = [
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

const GameScreen = () => {
  // Main navigation state
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'quiz', 'typing'
  
  // Camera permissions hook
  const [permission, requestPermission] = useCameraPermissions();
  
  // Quiz Mode States
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizScore, setQuizScore] = useState(0);
  const [quizRound, setQuizRound] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [usedQuizWords, setUsedQuizWords] = useState([]);
  
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
    console.log('Starting Quiz Mode...');
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
          'Please enable camera access in your device settings to play Quiz Mode with ASL signing.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // Permission granted, start the quiz
    console.log('Permission granted, initializing quiz...');
    setCurrentScreen('quiz');
    setQuizScore(0);
    setQuizRound(0);
    setUsedQuizWords([]);
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setCameraReady(false);
    generateQuizQuestion();
  };

  const generateQuizQuestion = () => {
    // Filter out already used words
    const availableWords = WORD_BANK.filter(
      item => !usedQuizWords.includes(item.word)
    );
    
    if (availableWords.length === 0) {
      // Game completed - all words used
      setQuizFeedback('🎉 QUIZ COMPLETED! You finished all questions!');
      return;
    }
    
    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    setQuizQuestion(randomWord);
    setQuizAnswer('');
    setQuizFeedback('');
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setUsedQuizWords([...usedQuizWords, randomWord.word]);
  };

  const submitQuizAnswer = () => {
    if (!quizQuestion) return;
    
    const userAnswer = quizAnswer.trim().toUpperCase();
    const correctAnswer = quizQuestion.word;
    
    if (userAnswer === correctAnswer) {
      setQuizScore(quizScore + 10);
      setQuizFeedback('✅ CORRECT! +10 points');
      setQuizRound(quizRound + 1);
      
      // Generate new question after a short delay
      setTimeout(() => {
        generateQuizQuestion();
      }, 1500);
    } else {
      setQuizFeedback(`❌ WRONG! The answer was: ${correctAnswer}`);
      setTimeout(() => {
        setQuizFeedback('');
      }, 2000);
    }
  };

  const exitQuizMode = () => {
    setCurrentScreen('menu');
    setQuizQuestion(null);
    setQuizAnswer('');
    setQuizFeedback('');
    setCurrentLetterIndex(0);
    setSignedLetters([]);
    setCameraReady(false);
  };

  const skipQuestion = () => {
    setQuizRound(quizRound + 1);
    setQuizFeedback('⏭️ SKIPPED');
    setTimeout(() => {
      generateQuizQuestion();
    }, 1000);
  };

  // Simulate sign detection for testing
  const simulateSignDetection = () => {
    if (!quizQuestion || isDetecting) return;
    
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
        setQuizFeedback('🎉 WORD COMPLETED! +10 points');
        setQuizRound(quizRound + 1);
        
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

  const onCameraReady = () => {
    console.log('Camera is ready!');
    setCameraReady(true);
  };

  // ==================== TYPING SPEED RUN FUNCTIONS ====================
  
  const startTypingMode = () => {
    setCurrentScreen('typing');
    setTypingScore(0);
    setCurrentWordIndex(0);
    setTypingInput('');
    setTypingWPM(0);
    setTypingTimer(30);
    setTypingGameActive(false);
    
    // Generate random word sequence
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
    setTypingWords(shuffled.slice(0, 20).map(item => item.word));
  };

  const startTypingGame = () => {
    setTypingGameActive(true);
    setTypingStartTime(Date.now());
    setTypingTimer(30);
  };

  useEffect(() => {
    if (typingGameActive && typingTimer > 0) {
      const interval = setInterval(() => {
        setTypingTimer(prev => {
          if (prev <= 1) {
            setTypingGameActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [typingGameActive, typingTimer]);

  const handleTypingInput = (text) => {
    setTypingInput(text);
    
    if (!typingGameActive) return;
    
    const currentWord = typingWords[currentWordIndex];
    
    // Check if word is complete and correct
    if (text.toUpperCase() === currentWord) {
      setTypingScore(typingScore + 1);
      setTypingInput('');
      
      // Calculate WPM
      const timeElapsed = (Date.now() - typingStartTime) / 1000 / 60; // in minutes
      const wpm = Math.round((typingScore + 1) / timeElapsed);
      setTypingWPM(wpm);
      
      // Move to next word
      if (currentWordIndex < typingWords.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        // Finished all words
        setTypingGameActive(false);
      }
    }
  };

  const exitTypingMode = () => {
    setCurrentScreen('menu');
    setTypingGameActive(false);
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
          Test your knowledge! Get hints about words, see the letter count, and spell the answer correctly.
        </Text>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>EDUCATIONAL</Text>
        </View>
      </TouchableOpacity>

      {/* Typing Speed Run Card */}
      <TouchableOpacity
        style={[styles.modeCard, { backgroundColor: colors.brutalGreen }]}
        activeOpacity={0.9}
        onPress={startTypingMode}
      >
        <View style={styles.modeIcon}>
          <Text style={styles.modeIconText}>⚡</Text>
        </View>
        <Text style={styles.modeTitle}>TYPING SPEED RUN</Text>
        <Text style={styles.modeDescription}>
          Type as fast as you can! Words appear one by one. Race against the clock to maximize your WPM.
        </Text>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>FAST-PACED</Text>
        </View>
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

    if (!quizQuestion) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading question...</Text>
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
              
              <TouchableOpacity style={styles.topButton} onPress={skipQuestion}>
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
          {/* Current Letter to Sign - Large Display */}
          {currentLetterIndex < quizQuestion.word.length && (
            <View style={styles.currentSignPromptBottom}>
              <Text style={styles.currentSignLabelBottom}>SIGN THIS LETTER:</Text>
              <Text style={styles.currentSignLetterBottom}>
                {quizQuestion.word[currentLetterIndex]}
              </Text>
            </View>
          )}

          {/* Word Progress Display */}
          <View style={styles.wordProgressContainerBottom}>
            <Text style={styles.wordProgressLabelBottom}>WORD PROGRESS:</Text>
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

  const renderTypingMode = () => (
    <View style={styles.typingContainer}>
      {/* Typing Header */}
      <View style={styles.gameHeader}>
        <TouchableOpacity style={styles.backButton} onPress={exitTypingMode}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>WPM</Text>
          <Text style={styles.scoreValue}>{typingWPM}</Text>
        </View>
      </View>

      <Text style={styles.gameTitle}>TYPING SPEED RUN</Text>

      {/* Timer and Score Row */}
      <View style={styles.typingStatsRow}>
        <View style={[styles.statBadge, { backgroundColor: colors.brutalYellow }]}>
          <Text style={styles.statBadgeLabel}>TIME</Text>
          <Text style={styles.statBadgeValue}>{typingTimer}s</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.brutalGreen }]}>
          <Text style={styles.statBadgeLabel}>WORDS</Text>
          <Text style={styles.statBadgeValue}>{typingScore}/{typingWords.length}</Text>
        </View>
      </View>

      {!typingGameActive && typingScore === 0 && (
        <View style={styles.typingInstructions}>
          <Text style={styles.instructionTitle}>HOW TO PLAY</Text>
          <Text style={styles.instructionText}>
            • Type the word shown as fast as you can{'\n'}
            • Press space or enter to submit{'\n'}
            • You have 30 seconds{'\n'}
            • Maximize your WPM!
          </Text>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.brutalGreen }]}
            onPress={startTypingGame}
            activeOpacity={0.9}
          >
            <Text style={styles.submitButtonText}>START TYPING</Text>
          </TouchableOpacity>
        </View>
      )}

      {typingWords.length > 0 && (typingGameActive || typingScore > 0) && (
        <View style={styles.typingPlayArea}>
          {/* Current Word Display */}
          <Animated.View
            style={[
              styles.currentWordCard,
              { transform: [{ scale: typingGameActive ? pulseAnim : 1 }] }
            ]}
          >
            <Text style={styles.currentWordLabel}>TYPE THIS WORD:</Text>
            <Text style={styles.currentWord}>
              {typingWords[currentWordIndex] || 'FINISHED!'}
            </Text>
          </Animated.View>

          {/* Typing Input */}
          {typingGameActive ? (
            <View style={styles.typingInputSection}>
              <TextInput
                style={styles.typingInput}
                value={typingInput}
                onChangeText={handleTypingInput}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={true}
                placeholder="Start typing..."
                placeholderTextColor="#999"
              />
            </View>
          ) : (
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverTitle}>
                {typingTimer === 0 ? '⏰ TIME\'S UP!' : '🎉 COMPLETED!'}
              </Text>
              <Text style={styles.gameOverScore}>
                Final Score: {typingScore} words
              </Text>
              <Text style={styles.gameOverWPM}>
                {typingWPM} WPM
              </Text>
              <TouchableOpacity
                style={[styles.submitButton, { marginTop: 20 }]}
                onPress={startTypingMode}
                activeOpacity={0.9}
              >
                <Text style={styles.submitButtonText}>PLAY AGAIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Progress Indicator */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(currentWordIndex / typingWords.length) * 100}%`,
                  backgroundColor: colors.brutalBlue,
                }
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );

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
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  currentSignLabelBottom: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    marginBottom: 8,
    letterSpacing: 2,
  },
  currentSignLetterBottom: {
    fontSize: 64,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    letterSpacing: 4,
  },
  
  // Word Progress - Bottom
  wordProgressContainerBottom: {
    marginBottom: 16,
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