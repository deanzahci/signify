import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn, FadeOut, ZoomIn, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/colors';
import { useTheme } from '../context/ThemeContext';
import { useThemedColors, useThemedShadow } from '../hooks/useThemedColors';
import { NBIcon } from '../components/NeoBrutalistIcons';
import SignDetectionManager from '../services/signDetection';
import signConfig from '../config/signRecognition';
import FrameCapture from '../utils/frameCapture';
import {
  useButtonPressAnimation,
  useSuccessAnimation,
  usePulseAnimation,
  useProgressAnimation
} from '../utils/animations';
import { HintButton, QuickHint, HintModal } from '../components/HintSystem';
import { updateLetterStats } from '../utils/gameApi';
import { auth } from '../config/firebase';
import DetectionDisplay from '../components/DetectionDisplay';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const SpeedGameScreen = ({
  quizQuestion,
  typingScore,
  currentWordIndex,
  typingWords,
  userLevelSpeed,
  typingTimer,
  quizFeedback,
  currentLetterIndex,
  signedLetters,
  isDetecting,
  typingGameActive,
  nextWordCountdown,
  onExitTyping,
  onSkipWord,
  onSimulateDetection,
  onCameraReady,
  onTimerEnd,
  onAllWordsCompleted
}) => {
  const { isDarkMode } = useTheme();
  const themedColors = useThemedColors();
  const shadowStyle = useThemedShadow('medium');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [localTimer, setLocalTimer] = useState(typingTimer);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [detectedLetter, setDetectedLetter] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [detectionMode, setDetectionMode] = useState('letter'); // Track detection mode
  const [isWordMode, setIsWordMode] = useState(false);
  const cameraRef = useRef(null);

  // Hint system state
  const [showQuickHint, setShowQuickHint] = useState(false);
  const [showFullHint, setShowFullHint] = useState(false);
  const [hintLevel, setHintLevel] = useState(1);

  // Animation hooks
  const detectButtonAnim = useButtonPressAnimation();
  const successAnim = useSuccessAnimation();
  const timerPulse = usePulseAnimation(localTimer <= 10 && localTimer > 0);
  const progressAnim = useProgressAnimation((typingWords.length - currentWordIndex) / typingWords.length);

  // Timer color animation
  const timerColorAnim = useSharedValue(colors.brutalGreen);

  useEffect(() => {
    if (localTimer <= 10 && localTimer > 5) {
      timerColorAnim.value = withTiming(colors.brutalYellow, { duration: 300 });
    } else if (localTimer <= 5 && localTimer > 0) {
      timerColorAnim.value = withTiming(colors.brutalRed, { duration: 300 });
    } else if (localTimer > 10) {
      timerColorAnim.value = withTiming(colors.brutalGreen, { duration: 300 });
    }
  }, [localTimer]);

  const timerStyle = useAnimatedStyle(() => ({
    color: timerColorAnim.value,
  }));

  // Load detection mode from AsyncStorage
  useEffect(() => {
    const loadDetectionMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('detectionMode');
        if (savedMode) {
          setDetectionMode(savedMode);
          setIsWordMode(savedMode === 'word');
          console.log('Loaded detection mode for Speed Game:', savedMode);
        } else {
          // Use config default
          const defaultMode = signConfig.recognition.defaultMode;
          setDetectionMode(defaultMode);
          setIsWordMode(defaultMode === 'word');
        }
      } catch (error) {
        console.error('Error loading detection mode:', error);
      }
    };
    loadDetectionMode();
  }, []);

  const handleCameraReady = () => {
    console.log('Camera is ready!');
    setCameraReady(true);

    // Notify FrameCapture that camera is ready
    FrameCapture.setCameraReady(true);

    if (onCameraReady) onCameraReady();

    // Start sign detection when camera is ready
    if (quizQuestion && cameraRef.current) {
      if (isWordMode) {
        // In word mode, detect the complete word
        console.log('Starting word detection for speed game:', quizQuestion.word);
        SignDetectionManager.startWordDetection(cameraRef, quizQuestion.word);
      } else if (currentLetterIndex < quizQuestion.word.length) {
        // In letter mode, detect letter by letter
        const currentLetter = quizQuestion.word[currentLetterIndex];
        console.log('Starting detection for speed typing letter:', currentLetter);
        SignDetectionManager.startDetection(cameraRef, currentLetter);
      }
    }
  };

  // Initialize sign detection when component mounts
  useEffect(() => {
    console.log('Initializing Sign Detection for Speed Game');

    SignDetectionManager.initialize(signConfig.websocket.url, {
      onLetterDetected: (letter) => {
        console.log('Letter detected in Speed Game:', letter);
        // Use the actual detected letter
        if (!isWordMode && props.onLetterDetected) {
          props.onLetterDetected(letter);
        } else if (!isWordMode && onSimulateDetection) {
          // Fallback to simulation if no letter handler provided
          onSimulateDetection();
        }
      },
      onWordDetected: (word) => {
        console.log('Word detected in Speed Game:', word);
        // In word mode, complete the entire word at once
        if (isWordMode && onSimulateDetection) {
          onSimulateDetection();
        }
      },
      onConfidenceUpdate: (confidence, value) => {
        setCurrentConfidence(confidence);
        setDetectedLetter(value);
      },
      onConnectionChange: (connected) => {
        console.log('WebSocket connection status:', connected);
        setIsConnected(connected);
      }
    });

    // Configure detection settings for speed game (faster detection)
    SignDetectionManager.updateConfig({
      confidenceThreshold: 0.7, // Lower threshold for faster gameplay
      requiredConsecutiveDetections: 1, // Immediate detection
      debugMode: signConfig.debug.enabled
    });

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up Speed Game screen');
      SignDetectionManager.stopDetection();
      FrameCapture.setCameraReady(false);
    };
  }, []);

  // Update target letter/word when it changes
  useEffect(() => {
    if (cameraReady && quizQuestion) {
      if (isWordMode) {
        // In word mode, update the target word
        console.log('Updating target word for speed game:', quizQuestion.word);
        SignDetectionManager.updateTargetWord(quizQuestion.word);
      } else if (currentLetterIndex < quizQuestion.word.length) {
        // In letter mode, update the target letter
        const newTargetLetter = quizQuestion.word[currentLetterIndex];
        console.log('Updating target letter for speed game:', newTargetLetter);
        SignDetectionManager.updateTargetLetter(newTargetLetter);
      }
    }
  }, [currentLetterIndex, quizQuestion, cameraReady, isWordMode]);

  // Timer countdown effect
  useEffect(() => {
    setLocalTimer(typingTimer);
  }, [typingTimer]);

  // Trigger success animation on correct feedback
  useEffect(() => {
    if (quizFeedback && (quizFeedback.includes('[CHECK]') || quizFeedback.includes('[SUCCESS]'))) {
      successAnim.trigger();
    }
  }, [quizFeedback]);

  // Automatic detection when confidence >= 85%
  useEffect(() => {
    if (
      typingGameActive &&
      !isDetecting &&
      nextWordCountdown === null &&
      currentConfidence >= 0.85 &&
      detectedLetter &&
      quizQuestion &&
      currentLetterIndex < quizQuestion.word.length
    ) {
      const targetLetter = quizQuestion.word[currentLetterIndex];
      
      // Check if detected letter matches target letter
      if (detectedLetter.toUpperCase() === targetLetter.toUpperCase()) {
        console.log(`Auto-detected: ${detectedLetter} at ${currentConfidence * 100}% confidence`);
        // Automatically trigger detection
        onSimulateDetection();
      }
    }
  }, [currentConfidence, detectedLetter, typingGameActive, isDetecting, nextWordCountdown, currentLetterIndex, quizQuestion]);

  useEffect(() => {
    if (typingGameActive && localTimer > 0 && nextWordCountdown === null) {
      const interval = setInterval(() => {
        setLocalTimer(prev => {
          if (prev <= 1) {
            if (onTimerEnd) onTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [typingGameActive, localTimer, onTimerEnd, nextWordCountdown]);

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

    // In speed mode, show quick hint immediately due to time pressure
    setShowQuickHint(true);
    setTimeout(() => setShowQuickHint(false), 2000); // Shorter duration for speed mode

    if (hintLevel >= 2) {
      setShowFullHint(true);
    }
    setHintLevel(prev => Math.min(prev + 1, 3));
  };

  // Reset hints when word changes
  useEffect(() => {
    setHintLevel(1);
    setShowQuickHint(false);
  }, [currentWordIndex]);

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
          <NBIcon name="Lightning" size={48} color={themedColors.brutalText} />
          <Text style={[styles.loadingText, { color: themedColors.brutalText }]}>Camera permission is required</Text>
          <Text style={[styles.loadingSubtext, { color: themedColors.brutalTextSecondary }]}>
            Please grant camera access to use SignSpeed
          </Text>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: themedColors.brutalGreen,
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
                  'Camera access is required for SignSpeed. Please enable it in your device settings.',
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
            onPress={onExitTyping}
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
              onPress={onExitTyping}
              entering={ZoomIn.duration(400).delay(300)}
            >
              <Text style={styles.topButtonText}>← BACK</Text>
            </AnimatedTouchableOpacity>

            <Animated.View style={styles.topCenter} entering={FadeIn.duration(600).delay(400)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <NBIcon name="Lightning" size={20} color={themedColors.brutalWhite} />
                <Animated.Text style={[styles.topScoreLabel, { marginLeft: 8 }, localTimer <= 10 && timerPulse]}>
                  LEVEL {userLevelSpeed} | {localTimer}s
                </Animated.Text>
              </View>
              <Text style={styles.topRoundLabel}>Word {currentWordIndex + 1}/{typingWords.length}</Text>
            </Animated.View>

            <AnimatedTouchableOpacity
              style={styles.topButton}
              onPress={onSkipWord}
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

          {/* Detection Display - Shows current detection and confidence - Hidden during countdown */}
          {cameraReady && nextWordCountdown === null && (
            <View style={styles.detectionDisplayContainer}>
              <DetectionDisplay
                isConnected={isConnected}
                currentDetection={detectedLetter}
                confidence={currentConfidence}
                targetValue={isWordMode ? quizQuestion?.word : quizQuestion?.word?.[currentLetterIndex]}
                isCorrect={quizFeedback && (quizFeedback.includes('[CHECK]') || quizFeedback.includes('[SUCCESS]'))}
              />
            </View>
          )}

          {/* Feedback Message Overlay on Camera - Hidden during countdown */}
          {quizFeedback && nextWordCountdown === null && (
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
                        : quizFeedback.includes('[TIMER]')
                        ? themedColors.brutalRed
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
                    {quizFeedback.replace(/\[(SUCCESS|CHECK|SKIP|TIMER)\]\s*/g, '')}
                  </Text>
                </View>
              </Animated.View>
            </Animated.View>
          )}

          {/* Next Word Countdown Overlay */}
          {nextWordCountdown !== null && nextWordCountdown > 0 && (
            <Animated.View
              style={styles.feedbackOverlayCenter}
              entering={ZoomIn.duration(300).springify()}
              exiting={FadeOut.duration(300)}
            >
              <Animated.View
                style={[
                  styles.countdownCard,
                  {
                    backgroundColor: themedColors.brutalYellow,
                    borderColor: themedColors.brutalBlack,
                    borderWidth: 6,
                    padding: 40,
                    ...shadowStyle,
                  },
                ]}
              >
                <Text style={[styles.countdownText, { color: themedColors.brutalBlack, fontSize: 20, marginBottom: 10 }]}>
                  ⏭️ NEXT WORD IN
                </Text>
                <Text style={[styles.countdownNumber, { color: themedColors.brutalBlack, fontSize: 72, fontWeight: 'bold' }]}>
                  {nextWordCountdown}
                </Text>
              </Animated.View>
            </Animated.View>
          )}
        </CameraView>
      </View>

      {/* Bottom Content Area (40% of screen) */}
      <View style={[styles.bottomContentArea, isDarkMode && { backgroundColor: themedColors.brutalBackground }]}>
        {/* Timer Display - Compact */}
        <Animated.View
          style={[
            styles.quizCard,
            {
              backgroundColor: localTimer > 10 ? themedColors.brutalGreen : localTimer > 5 ? themedColors.brutalYellow : themedColors.brutalRed,
              borderColor: themedColors.brutalBlack,
              ...shadowStyle,
              marginBottom: 6,
              paddingVertical: 8
            },
            localTimer <= 10 && timerPulse
          ]}
          entering={ZoomIn.duration(400).delay(100)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <NBIcon name="Lightning" size={16} color={isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite} />
            <Text style={[styles.quizCardLabel, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite, fontSize: 11, marginLeft: 6 }]}>TIME</Text>
          </View>
          <Animated.Text style={[styles.quizLetterCount, { color: themedColors.brutalWhite, fontSize: 32, textAlign: 'center' }]}>
            {localTimer}s
          </Animated.Text>
        </Animated.View>

        {/* Current Word Display - Different for word vs letter mode */}
        {quizQuestion && (
          <View style={styles.wordProgressContainerBottom}>
            <Text style={[styles.wordProgressLabelBottom, { fontSize: 11, marginBottom: 4, color: themedColors.brutalBlack }]}>
              {isWordMode ? 'TARGET WORD:' : 'CURRENT WORD:'}
            </Text>
            {isWordMode ? (
              // In word mode, show the complete word to sign
              <View style={[styles.currentSignPromptBottom, { paddingVertical: 12, marginBottom: 8, backgroundColor: themedColors.brutalPurple, borderColor: themedColors.brutalBlack }]}>
                <Text style={[styles.currentSignLetterBottom, { fontSize: 32, color: themedColors.brutalWhite }]}>
                  {quizQuestion.word}
                </Text>
              </View>
            ) : (
              // In letter mode, show letter-by-letter progress
              <View style={styles.wordDisplay}>
                {quizQuestion.word.split('').map((letter, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.letterDisplayBox,
                      {
                        backgroundColor: themedColors.brutalWhite,
                        borderColor: themedColors.brutalBlack,
                      },
                      idx < currentLetterIndex && {
                        backgroundColor: themedColors.brutalGreen,
                      },
                      idx === currentLetterIndex && {
                        backgroundColor: themedColors.brutalYellow,
                        borderWidth: 5,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.letterDisplayText,
                        { color: themedColors.brutalBlack },
                        idx < currentLetterIndex && styles.letterDisplayTextCompleted,
                        idx === currentLetterIndex && styles.letterDisplayTextCurrent,
                      ]}
                    >
                      {idx < currentLetterIndex ? letter : '_'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Current Letter to Sign - Only show in letter mode */}
        {!isWordMode && quizQuestion && currentLetterIndex < quizQuestion.word.length && (
          <View style={[styles.currentSignPromptBottom, { paddingVertical: 6, marginVertical: 4, backgroundColor: themedColors.brutalPurple, borderColor: themedColors.brutalBlack }]}>
            <Text style={[styles.currentSignLabelBottom, { fontSize: 11, marginBottom: 2, color: themedColors.brutalWhite }]}>SIGN:</Text>
            <Text style={[styles.currentSignLetterBottom, { fontSize: 24, color: themedColors.brutalWhite }]}>
              {quizQuestion.word[currentLetterIndex] || ''}
            </Text>
          </View>
        )}

        {/* Test Button - Compact */}
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
          disabled={isDetecting || nextWordCountdown !== null}
          activeOpacity={1}
          entering={ZoomIn.duration(400).delay(100)}
        >
          <Text style={[styles.detectButtonText, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>
            {nextWordCountdown !== null ? 'WAITING...' : isDetecting ? 'DETECTING...' : 'DETECT SIGN'}
          </Text>
        </AnimatedTouchableOpacity>
      </View>

      {/* Floating Hint Button - Only show in letter mode */}
      {!isWordMode && (
        <HintButton
          onPress={handleHintPress}
          isStruggling={localTimer <= 5}
          attemptsCount={0}
          style={{
            bottom: 100,
            right: 20,
            zIndex: 1000,
            width: 48,
            height: 48,
          }}
        />
      )}

      {/* Quick Hint Popup - Only show in letter mode */}
      {!isWordMode && quizQuestion && (
        <QuickHint
          letter={currentLetterIndex < quizQuestion.word.length ? quizQuestion.word[currentLetterIndex] : ''}
          visible={showQuickHint}
          onClose={() => setShowQuickHint(false)}
          hintLevel={hintLevel}
        />
      )}

      {/* Full Hint Modal - Only show in letter mode */}
      {!isWordMode && quizQuestion && (
        <HintModal
          letter={currentLetterIndex < quizQuestion.word.length ? quizQuestion.word[currentLetterIndex] : ''}
          visible={showFullHint}
          onClose={() => setShowFullHint(false)}
          showAllDetails={true} // Always show all details in speed mode
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  topCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  topScoreLabel: {
    fontSize: 16,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    backgroundColor: colors.brutalBlue,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
  quizLetterCount: {
    fontSize: 24,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    marginBottom: 12,
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

  // Test Button
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
    letterSpacing: 1,
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
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  progressBarContainer: {
    height: 28,
    backgroundColor: colors.brutalGray,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.brutalGreen,
    transition: 'width 0.3s ease',
  },
  countdownCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 0,
  },
  countdownText: {
    fontFamily: 'Sora-Bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  countdownNumber: {
    fontFamily: 'Sora-ExtraBold',
    textAlign: 'center',
  },
});

export default SpeedGameScreen;