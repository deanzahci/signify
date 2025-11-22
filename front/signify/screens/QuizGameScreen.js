import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../styles/colors';
import SignDetectionManager from '../services/signDetection';
import signConfig from '../config/signRecognition';

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
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [detectedLetter, setDetectedLetter] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const cameraRef = useRef(null);

  const handleCameraReady = () => {
    console.log('Camera is ready!');
    setCameraReady(true);
    if (onCameraReady) onCameraReady();

    // Start sign detection when camera is ready
    if (quizQuestion && cameraRef.current) {
      const currentLetter = quizQuestion.word[currentLetterIndex];
      console.log('Starting detection for quiz letter:', currentLetter);

      SignDetectionManager.startDetection(cameraRef, currentLetter);
    }
  };

  // Initialize sign detection when component mounts
  useEffect(() => {
    console.log('Initializing Sign Detection for Quiz Game');

    SignDetectionManager.initialize(signConfig.websocket.url, {
      onLetterDetected: (letter) => {
        console.log('Letter detected in Quiz:', letter);
        // Call the original simulate detection to advance the game
        if (onSimulateDetection) {
          onSimulateDetection();
        }
      },
      onConfidenceUpdate: (confidence, letter) => {
        setCurrentConfidence(confidence);
        setDetectedLetter(letter);
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

    // Cleanup on unmount
    return () => {
      SignDetectionManager.stopDetection();
    };
  }, []);

  // Update target letter when it changes
  useEffect(() => {
    if (cameraReady && quizQuestion && currentLetterIndex < quizQuestion.word.length) {
      const newTargetLetter = quizQuestion.word[currentLetterIndex];
      console.log('Updating target letter for quiz:', newTargetLetter);
      SignDetectionManager.updateTargetLetter(newTargetLetter);
    }
  }, [currentLetterIndex, quizQuestion, cameraReady]);

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
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
            onPress={onExitQuiz}
          >
            <Text style={[styles.submitButtonText, { color: colors.brutalBlack }]}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
          onCameraReady={handleCameraReady}
          onMountError={(error) => {
            console.error('Camera mount error:', error);
            Alert.alert('Camera Error', `Failed to start camera: ${error.message}`);
          }}
        >
          {/* Top Bar Overlay on Camera */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.topButton} onPress={onExitQuiz}>
              <Text style={styles.topButtonText}>← BACK</Text>
            </TouchableOpacity>

            <View style={styles.topCenter}>
              <Text style={styles.topScoreLabel}>LV{userLevelQuiz} | {quizScore}</Text>
              <Text style={styles.topRoundLabel}>Round {quizRound + 1}</Text>
            </View>

            <TouchableOpacity style={styles.topButton} onPress={onSkipQuestion}>
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
        {/* Hint Card - Compact */}
        <View style={[styles.quizCard, { backgroundColor: colors.brutalYellow, marginBottom: 6, paddingVertical: 8, paddingHorizontal: 12 }]}>
          <Text style={[styles.quizCardLabel, { fontSize: 11 }]}>💡 HINT</Text>
          <Text style={[styles.quizHint, { fontSize: 13 }]}>{quizQuestion.hint}</Text>
        </View>

        {/* Word Progress - Compact */}
        <View style={styles.wordProgressContainerBottom}>
          <Text style={[styles.wordProgressLabelBottom, { fontSize: 11, marginBottom: 4 }]}>WORD PROGRESS:</Text>
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

        {/* Current Letter to Sign - Compact */}
        {currentLetterIndex < quizQuestion.word.length && (
          <View style={[styles.currentSignPromptBottom, { paddingVertical: 6, marginVertical: 4 }]}>
            <Text style={[styles.currentSignLabelBottom, { fontSize: 11, marginBottom: 2 }]}>
              {currentLetterIndex === 0 ? 'SIGN FIRST LETTER' : 'NEXT'}
            </Text>
            <Text style={[styles.currentSignLetterBottom, { fontSize: 24 }]}>?</Text>
          </View>
        )}

        {/* Test Button - Compact and visible */}
        <TouchableOpacity
          style={[
            styles.detectButtonBottom,
            isDetecting && styles.detectButtonDisabled,
          ]}
          onPress={onSimulateDetection}
          disabled={isDetecting}
          activeOpacity={0.9}
        >
          <Text style={styles.detectButtonText}>
            {isDetecting ? 'DETECTING...' : '🤚 DETECT SIGN'}
          </Text>
        </TouchableOpacity>
      </View>
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  topCenter: {
    alignItems: 'center',
    flex: 0, // Don't let center grow and squeeze buttons
  },
  topScoreLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    backgroundColor: colors.brutalBlue,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
  },
  topRoundLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    marginTop: 4,
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
    fontWeight: 'bold',
    color: colors.brutalWhite,
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
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
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

  // Word Progress
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: colors.brutalBlack,
    fontFamily: 'monospace',
  },

  // Confidence Container
  confidenceContainer: {
    marginBottom: 12,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});

export default QuizGameScreen;