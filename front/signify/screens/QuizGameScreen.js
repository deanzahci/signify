import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/colors';
import { useTheme } from '../context/ThemeContext';
import { useThemedColors, useThemedShadow } from '../hooks/useThemedColors';
import { NBIcon } from '../components/NeoBrutalistIcons';
import SignDetectionManager from '../services/signDetection';
import signConfig from '../config/signRecognition';
import {
  useButtonPressAnimation,
  useSuccessAnimation,
  usePulseAnimation,
  useFloatingAnimation
} from '../utils/animations';
import { HintButton, QuickHint, HintModal, MiniHint } from '../components/HintSystem';
import { updateLetterStats } from '../utils/gameApi';
import { auth } from '../config/firebase';
import DetectionDisplay from '../components/DetectionDisplay';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Letter Box Component with its own animation
const LetterBox = ({ letter, idx, currentLetterIndex, styles, themedColors }) => {
  const isCompleted = idx < currentLetterIndex;
  const isCurrent = idx === currentLetterIndex;
  const pulseAnimation = usePulseAnimation(isCurrent);

  return (
    <Animated.View
      style={[
        styles.letterDisplayBox,
        {
          backgroundColor: themedColors.brutalWhite,
          borderColor: themedColors.brutalBlack,
          shadowColor: themedColors.brutalBlack,
        },
        isCompleted && {
          backgroundColor: themedColors.brutalGreen,
        },
        isCurrent && {
          backgroundColor: themedColors.brutalYellow,
          borderWidth: 4,
        },
        isCurrent && pulseAnimation,
      ]}
      entering={FadeIn.duration(300).delay(idx * 50)}
    >
      <Text
        style={[
          styles.letterDisplayText,
          { color: themedColors.brutalBlack },
          isCompleted && styles.letterDisplayTextCompleted,
          isCurrent && styles.letterDisplayTextCurrent,
        ]}
      >
        {isCompleted ? letter : '?'}
      </Text>
    </Animated.View>
  );
};

const QuizGameScreen = ({
  quizQuestion,
  quizScore,
  quizRound,
  userLevelQuiz,
  quizFeedback,
  currentLetterIndex,
  signedLetters,
  isDetecting,
  onExitQuiz,
  onSkipQuestion,
  onSimulateDetection,
  onCameraReady
}) => {
  const { isDarkMode } = useTheme();
  const themedColors = useThemedColors();
  const shadowStyle = useThemedShadow('medium');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [detectedValue, setDetectedValue] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isWordMode, setIsWordMode] = useState(false);
  const cameraRef = useRef(null);
  const [prevScore, setPrevScore] = useState(quizScore);

  // Hint system state
  const [showQuickHint, setShowQuickHint] = useState(false);
  const [showFullHint, setShowFullHint] = useState(false);
  const [hintLevel, setHintLevel] = useState(1);
  const [attemptsSinceHint, setAttemptsSinceHint] = useState(0);
  const [isStruggling, setIsStruggling] = useState(false);

  // Animation hooks
  const detectButtonAnim = useButtonPressAnimation();
  const successAnim = useSuccessAnimation();
  const floatingScoreAnim = useFloatingAnimation();

  const handleCameraReady = () => {
    console.log('Camera is ready!');
    setCameraReady(true);
    if (onCameraReady) onCameraReady();

    // Start sign detection when camera is ready
    if (quizQuestion && cameraRef.current) {
      if (isWordMode) {
        // Word mode: detect the entire word at once
        console.log('Starting word detection for:', quizQuestion.word);
        SignDetectionManager.startWordDetection(cameraRef, quizQuestion.word);
      } else {
        // Letter mode: detect letter by letter
        if (currentLetterIndex < quizQuestion.word.length) {
          const currentLetter = quizQuestion.word[currentLetterIndex];
          console.log('Starting detection for quiz letter:', currentLetter);
          SignDetectionManager.startDetection(cameraRef, currentLetter);
        }
      }
    }
  };

  // Initialize sign detection when component mounts
  useEffect(() => {
    const initializeDetection = async () => {
      console.log('Initializing Sign Detection for Quiz Game');

      // Load detection mode from storage or use config default
      const savedMode = await AsyncStorage.getItem('detectionMode');
      const mode = savedMode || signConfig.recognition.defaultMode;
      setIsWordMode(mode === 'word');
      console.log('Detection mode:', mode);

      SignDetectionManager.initialize(signConfig.websocket.url, {
        onLetterDetected: (letter) => {
          console.log('Letter detected in Quiz:', letter);
          // In letter mode, advance to next letter
          if (mode !== 'word' && onSimulateDetection) {
            onSimulateDetection();
          }
        },
        onWordDetected: (word) => {
          console.log('Word detected in Quiz:', word);
          // In word mode, complete the entire word
          if (mode === 'word' && onSimulateDetection) {
            // Complete all letters at once
            onSimulateDetection();
          }
        },
        onConfidenceUpdate: (confidence, value) => {
          setCurrentConfidence(confidence);
          setDetectedValue(value);
        },
        onConnectionChange: (connected) => {
          console.log('WebSocket connection status:', connected);
          setIsConnected(connected);
        }
      });

      // Configure detection settings
      SignDetectionManager.updateConfig({
        confidenceThreshold: signConfig.recognition.confidenceThreshold,
        requiredConsecutiveDetections: signConfig.recognition.requiredConsecutiveDetections,
        debugMode: signConfig.debug.enabled
      });
    };

    initializeDetection();

    // Cleanup on unmount
    return () => {
      SignDetectionManager.stopDetection();
    };
  }, []);

  // Update target when it changes
  useEffect(() => {
    if (cameraReady && quizQuestion) {
      if (isWordMode) {
        // In word mode, always target the full word
        console.log('Updating target word for quiz:', quizQuestion.word);
        SignDetectionManager.updateTargetWord(quizQuestion.word);
      } else {
        // In letter mode, target the current letter
        if (currentLetterIndex < quizQuestion.word.length) {
          const newTargetLetter = quizQuestion.word[currentLetterIndex];
          console.log('Updating target letter for quiz:', newTargetLetter);
          SignDetectionManager.updateTargetLetter(newTargetLetter);
        }
      }
    }
  }, [currentLetterIndex, quizQuestion, cameraReady, isWordMode]);

  // Trigger score animation when score changes
  useEffect(() => {
    if (quizScore > prevScore) {
      floatingScoreAnim.trigger();
      setPrevScore(quizScore);
    }
  }, [quizScore]);

  // Trigger success animation on correct feedback
  useEffect(() => {
    if (quizFeedback && (quizFeedback.includes('✅') || quizFeedback.includes('🎉'))) {
      successAnim.trigger();
    }
  }, [quizFeedback]);

  // Track struggling behavior
  useEffect(() => {
    // Reset attempts when letter changes
    setAttemptsSinceHint(0);
    setIsStruggling(false);
    setHintLevel(1);
    setShowQuickHint(false);
  }, [currentLetterIndex]);

  // Handle hint button press
  const handleHintPress = async () => {
    // Track the current letter as a struggle letter when hint is used
    if (quizQuestion && currentLetterIndex < quizQuestion.word.length) {
      const currentLetter = quizQuestion.word[currentLetterIndex];
      const user = auth.currentUser;
      if (user) {
        // Mark this letter as a skip/struggle since they needed a hint
        await updateLetterStats(user.uid, currentLetter, 'skip');
        console.log(`Tracked hint usage for letter: ${currentLetter}`);
      }
    }

    if (hintLevel === 1) {
      setShowQuickHint(true);
      setTimeout(() => setShowQuickHint(false), 3000);
    } else {
      setShowFullHint(true);
    }
    setHintLevel(prev => Math.min(prev + 1, 4));
  };

  // Handle skip with hint tracking
  const handleSkipWithHint = () => {
    setAttemptsSinceHint(prev => prev + 1);
    if (attemptsSinceHint >= 2) {
      setIsStruggling(true);
    }
    onSkipQuestion();
  };

  if (!permission) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? themedColors.brutalBackground : themedColors.brutalWhite }]}>
        <Text style={[styles.loadingText, { color: themedColors.brutalText }]}>Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? themedColors.brutalBackground : themedColors.brutalWhite }]}>
        <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? themedColors.brutalBackground : themedColors.brutalWhite }]}>
          <NBIcon name="Brain" size={48} color={themedColors.brutalText} />
          <Text style={[styles.loadingText, { color: themedColors.brutalText }]}>Camera permission is required</Text>
          <Text style={[styles.loadingSubtext, { color: themedColors.brutalTextSecondary }]}>
            Please grant camera access to use Quiz Mode
          </Text>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: themedColors.brutalBlue,
                borderColor: themedColors.brutalBlack,
                ...shadowStyle,
                marginTop: 20
              }
            ]}
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
            <Text style={[styles.submitButtonText, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>REQUEST PERMISSION</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: themedColors.brutalWhite,
                borderColor: themedColors.brutalBlack,
                ...shadowStyle,
                marginTop: 12
              }
            ]}
            onPress={onExitQuiz}
          >
            <Text style={[styles.submitButtonText, { color: themedColors.brutalBlack }]}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.quizFullScreen, isDarkMode && { backgroundColor: themedColors.brutalBackground }]}>
      {/* Camera View at Top (60% of screen) */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onCameraReady={handleCameraReady}
          onMountError={(error) => {
            console.error('Camera mount error:', error);
            Alert.alert('Camera Error', `Failed to start camera: ${error.message}`);
          }}
        >
          {/* Top Bar Overlay on Camera */}
          <Animated.View style={styles.topBar} entering={FadeIn.duration(500).delay(200)}>
            <AnimatedTouchableOpacity
              style={styles.topButton}
              onPress={onExitQuiz}
              entering={ZoomIn.duration(400).delay(300)}
            >
              <Text style={styles.topButtonText}>← BACK</Text>
            </AnimatedTouchableOpacity>

            <Animated.View style={styles.topCenter} entering={FadeIn.duration(600).delay(400)}>
              <Text style={styles.topScoreLabel}>LV{userLevelQuiz} | {quizScore}</Text>
              <Text style={styles.topRoundLabel}>Round {quizRound + 1}</Text>
              {/* Floating score indicator */}
              {quizScore > prevScore && (
                <Animated.View style={[styles.floatingScore, floatingScoreAnim.animatedStyle]}>
                  <Text style={styles.floatingScoreText}>+10</Text>
                </Animated.View>
              )}
            </Animated.View>

            <AnimatedTouchableOpacity
              style={styles.topButton}
              onPress={handleSkipWithHint}
              entering={ZoomIn.duration(400).delay(300)}
            >
              <Text style={styles.topButtonText}>SKIP →</Text>
            </AnimatedTouchableOpacity>
          </Animated.View>

          {/* Camera Ready Indicator */}
          {!cameraReady && (
            <View style={styles.cameraLoadingOverlay}>
              <Text style={styles.cameraLoadingText}>Starting camera...</Text>
            </View>
          )}

          {/* Detection Display - Shows current detection and confidence */}
          {cameraReady && (
            <View style={styles.detectionDisplayContainer}>
              <DetectionDisplay
                isConnected={isConnected}
                currentDetection={detectedValue}
                confidence={currentConfidence}
                targetValue={isWordMode ? quizQuestion?.word : quizQuestion?.word?.[currentLetterIndex]}
                isCorrect={quizFeedback && (quizFeedback.includes('[CHECK]') || quizFeedback.includes('[SUCCESS]'))}
              />
            </View>
          )}

          {/* Feedback Message Overlay on Camera */}
          {quizFeedback && (
            <Animated.View
              style={styles.feedbackOverlayCenter}
              entering={ZoomIn.duration(400).springify().damping(20).stiffness(120)}
              exiting={FadeOut.duration(350)}
            >
              <Animated.View
                style={[
                  styles.feedbackCard,
                  successAnim.animatedStyle,
                  {
                    backgroundColor:
                      quizFeedback.includes('[CHECK]') || quizFeedback.includes('[SUCCESS]')
                        ? themedColors.brutalGreen
                        : quizFeedback.includes('[SKIP]')
                        ? themedColors.brutalYellow
                        : themedColors.brutalRed,
                    borderColor: themedColors.brutalBlack,
                    ...shadowStyle,
                  },
                ]}
              >
                <View style={styles.feedbackContent}>
                  {quizFeedback.includes('[SUCCESS]') && (
                    <NBIcon name="Celebrate" size={40} color={themedColors.brutalWhite} />
                  )}
                  {quizFeedback.includes('[CHECK]') && (
                    <NBIcon name="Check" size={40} color={themedColors.brutalWhite} />
                  )}
                  {quizFeedback.includes('[SKIP]') && (
                    <NBIcon name="Skip" size={40} color={themedColors.brutalWhite} />
                  )}
                  <Text style={styles.feedbackOverlayText}>
                    {quizFeedback.replace(/\[(SUCCESS|CHECK|SKIP)\]\s*/g, '')}
                  </Text>
                </View>
              </Animated.View>
            </Animated.View>
          )}
        </CameraView>
      </View>

      {/* Bottom Content Area (40% of screen) */}
      <View style={[styles.bottomContentArea, isDarkMode && { backgroundColor: themedColors.brutalBackground }]}>
        {/* Hint Card - Compact */}
        {quizQuestion && (
          <View style={[styles.quizCard, { backgroundColor: themedColors.brutalYellow, borderColor: themedColors.brutalBlack, borderWidth: 4, ...shadowStyle, marginBottom: 6, paddingVertical: 8, paddingHorizontal: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <NBIcon name="Brain" size={16} color={themedColors.brutalBlack} />
              <Text style={[styles.quizCardLabel, { fontSize: 11, marginLeft: 6, color: themedColors.brutalBlack }]}>HINT</Text>
            </View>
            <Text style={[styles.quizHint, { fontSize: 13, color: themedColors.brutalBlack }]}>
              {quizQuestion.hint}
              {isWordMode && ` (${quizQuestion.word.length} letters)`}
            </Text>
          </View>
        )}

        {/* Word Progress - Show differently based on mode */}
        {quizQuestion && (
          <View style={styles.wordProgressContainerBottom}>
            <Text style={[styles.wordProgressLabelBottom, { fontSize: 11, marginBottom: 4, color: themedColors.brutalBlack }]}>
              {isWordMode ? 'WORD TO SIGN:' : 'WORD PROGRESS:'}
            </Text>
            {isWordMode ? (
              // Word mode: Show blanks for the word (Hangman style)
              <View style={styles.wordDisplay}>
                {quizQuestion.word.split('').map((letter, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.letterDisplayBox,
                      {
                        backgroundColor: themedColors.brutalWhite,
                        borderColor: themedColors.brutalBlack,
                        shadowColor: themedColors.brutalBlack,
                      },
                      currentLetterIndex >= quizQuestion.word.length && {
                        backgroundColor: themedColors.brutalGreen,
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.letterDisplayText,
                        { color: themedColors.brutalBlack },
                        currentLetterIndex >= quizQuestion.word.length && styles.letterDisplayTextCompleted
                      ]}
                    >
                      {currentLetterIndex >= quizQuestion.word.length ? letter : '_'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              // Letter mode: Show progress boxes
              <View style={styles.wordDisplay}>
                {quizQuestion.word.split('').map((letter, idx) => (
                  <LetterBox
                    key={idx}
                    letter={letter}
                    idx={idx}
                    currentLetterIndex={currentLetterIndex}
                    styles={styles}
                    themedColors={themedColors}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Current Letter to Sign - Only show in letter mode */}
        {!isWordMode && quizQuestion && currentLetterIndex < quizQuestion.word.length && (
          <View style={[styles.currentSignPromptBottom, { paddingVertical: 6, marginVertical: 4, backgroundColor: themedColors.brutalPurple, borderColor: themedColors.brutalBlack }]}>
            <Text style={[styles.currentSignLabelBottom, { fontSize: 11, marginBottom: 2, color: themedColors.brutalWhite }]}>
              {currentLetterIndex === 0 ? 'SIGN FIRST LETTER' : 'NEXT'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[styles.currentSignLetterBottom, { fontSize: 24, color: themedColors.brutalWhite }]}>
                ?
              </Text>
              {/* Mini hint inline */}
              {isStruggling && (
                <MiniHint letter={quizQuestion.word[currentLetterIndex]} style={{ marginLeft: 12 }} />
              )}
            </View>
          </View>
        )}

        {/* Test Button - Compact and visible */}
        <AnimatedTouchableOpacity
          style={[
            styles.detectButtonBottom,
            {
              backgroundColor: themedColors.brutalBlue,
              borderColor: themedColors.brutalBlack,
              shadowColor: themedColors.brutalBlack,
            },
            isDetecting && styles.detectButtonDisabled,
            detectButtonAnim.animatedStyle,
          ]}
          onPress={onSimulateDetection}
          onPressIn={detectButtonAnim.handlePressIn}
          onPressOut={detectButtonAnim.handlePressOut}
          disabled={isDetecting}
          activeOpacity={1}
          entering={ZoomIn.duration(400).delay(100)}
        >
          <Text style={[styles.detectButtonText, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>
            {isDetecting ? 'DETECTING...' : '🤚 DETECT SIGN'}
          </Text>
        </AnimatedTouchableOpacity>
      </View>

      {/* Floating Hint Button */}
      <HintButton
        onPress={handleHintPress}
        isStruggling={isStruggling}
        attemptsCount={attemptsSinceHint}
        style={{
          bottom: 120,
          right: 20,
          zIndex: 1000,
        }}
      />

      {/* Quick Hint Popup */}
      {quizQuestion && currentLetterIndex < quizQuestion.word.length && (
        <QuickHint
          letter={quizQuestion.word[currentLetterIndex]}
          visible={showQuickHint}
          onClose={() => setShowQuickHint(false)}
          hintLevel={hintLevel}
        />
      )}

      {/* Full Hint Modal */}
      {quizQuestion && currentLetterIndex < quizQuestion.word.length && (
        <HintModal
          letter={quizQuestion.word[currentLetterIndex]}
          visible={showFullHint}
          onClose={() => setShowFullHint(false)}
          showAllDetails={hintLevel >= 3}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.brutalWhite,
  },
  loadingText: {
    fontSize: 20,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.brutalBlack,
    textAlign: 'center',
    fontFamily: 'Sora-Regular',
  },
  submitButton: {
    backgroundColor: colors.brutalBlue,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    textAlign: 'center',
    letterSpacing: 1,
  },

  // Full Screen Layout
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Add semi-transparent background
  },
  topButton: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    minWidth: 80, // Ensure minimum width
  },
  topButtonText: {
    fontSize: 13,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  topCenter: {
    alignItems: 'center',
    flex: 0, // Don't let center grow and squeeze buttons
  },
  topScoreLabel: {
    fontSize: 14,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    backgroundColor: colors.brutalBlue,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
  },
  topRoundLabel: {
    fontSize: 12,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Camera Overlays
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
  },
  detectionDisplayContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
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
  feedbackOverlayText: {
    fontSize: 18,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    textAlign: 'center',
  },
  feedbackContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Content Area
  bottomContentArea: {
    flex: 0.4,
    backgroundColor: colors.brutalWhite,
    padding: 16,
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    marginBottom: 8,
    letterSpacing: 1,
  },
  quizHint: {
    fontSize: 18,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },

  // Word Progress
  wordProgressContainerBottom: {
    marginBottom: 12,
  },
  wordProgressLabelBottom: {
    fontSize: 12,
    fontFamily: 'Sora-Bold',
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
    width: 40,
    height: 48,
    backgroundColor: colors.brutalWhite,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    marginHorizontal: 3,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  letterDisplayBoxCompleted: {
    backgroundColor: colors.brutalGreen,
  },
  letterDisplayBoxCurrent: {
    backgroundColor: colors.brutalYellow,
    borderWidth: 4,
  },
  letterDisplayText: {
    fontSize: 22,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  letterDisplayTextCompleted: {
    color: colors.brutalWhite,
  },
  letterDisplayTextCurrent: {
    color: colors.brutalBlack,
  },

  // Current Letter Prompt
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    marginBottom: 4,
    letterSpacing: 1,
  },
  currentSignLetterBottom: {
    fontSize: 36,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    letterSpacing: 2,
  },

  // Test Button - Smaller and compact
  detectButtonBottom: {
    backgroundColor: colors.brutalBlue,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 6,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  detectButtonDisabled: {
    backgroundColor: colors.brutalGray,
    opacity: 0.7,
  },
  detectButtonText: {
    fontSize: 13,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Detection Container
  detectionContainer: {
    marginTop: 8,
  },

  // Connection Status
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },

  // Confidence Container
  confidenceContainer: {
    marginBottom: 12,
  },
  confidenceLabel: {
    fontSize: 12,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    marginBottom: 8,
    letterSpacing: 1,
  },
  progressBarContainer: {
    height: 24,
    backgroundColor: colors.brutalGray,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.brutalGreen,
    transition: 'width 0.3s ease',
  },
  detectedLetterText: {
    fontSize: 14,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    textAlign: 'center',
  },

  // Floating score animation
  floatingScore: {
    position: 'absolute',
    top: -20,
    right: -30,
    backgroundColor: colors.brutalGreen,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  floatingScoreText: {
    fontSize: 16,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
  },
});

export default QuizGameScreen;