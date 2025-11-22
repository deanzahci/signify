import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn, FadeOut, ZoomIn, Layout } from 'react-native-reanimated';
import { colors } from '../styles/colors';
import SignDetectionManager from '../services/signDetection';
import signConfig from '../config/signRecognition';
import {
  useButtonPressAnimation,
  useSuccessAnimation,
  useEntranceAnimation,
  usePulseAnimation,
  useFloatingAnimation
} from '../utils/animations';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const WordGameScreen = ({
  targetWord,
  score,
  round,
  userLevel,
  feedback,
  isDetecting,
  onExitGame,
  onSkipWord,
  onWordCompleted,
  onCameraReady,
  gameMode = 'practice' // 'practice' or 'challenge'
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [detectedWord, setDetectedWord] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const cameraRef = useRef(null);
  const [prevScore, setPrevScore] = useState(score);

  // Animation hooks
  const detectButtonAnim = useButtonPressAnimation();
  const successAnim = useSuccessAnimation();
  const floatingScoreAnim = useFloatingAnimation();
  const wordPulse = usePulseAnimation(true);

  const handleCameraReady = () => {
    console.log('Camera is ready for word detection!');
    setCameraReady(true);
    if (onCameraReady) onCameraReady();

    // Start word detection when camera is ready
    if (targetWord && cameraRef.current) {
      console.log('Starting word detection for:', targetWord);
      SignDetectionManager.startWordDetection(cameraRef, targetWord);
    }
  };

  // Initialize sign detection with word mode
  useEffect(() => {
    console.log('Initializing Sign Detection for Word Game');

    SignDetectionManager.initialize(signConfig.websocket.url, {
      onWordDetected: (word) => {
        console.log('Word detected:', word);
        if (onWordCompleted) {
          onWordCompleted(word);
        }
      },
      onConfidenceUpdate: (confidence, word) => {
        setCurrentConfidence(confidence);
        setDetectedWord(word);
      },
      onConnectionChange: (connected) => {
        console.log('WebSocket connection status:', connected);
        setIsConnected(connected);
      }
    });

    // Configure detection settings for word mode
    SignDetectionManager.updateConfig({
      confidenceThreshold: signConfig.recognition.wordMode.wordConfidenceThreshold,
      requiredConsecutiveDetections: signConfig.recognition.wordMode.requiredConsecutiveWordDetections,
      debugMode: signConfig.debug.enabled
    });

    // Cleanup on unmount
    return () => {
      SignDetectionManager.stopDetection();
    };
  }, []);

  // Update target word when it changes
  useEffect(() => {
    if (cameraReady && targetWord) {
      console.log('Updating target word to:', targetWord);
      SignDetectionManager.updateTargetWord(targetWord);
    }
  }, [targetWord, cameraReady]);

  // Trigger score animation when score changes
  useEffect(() => {
    if (score > prevScore) {
      floatingScoreAnim.trigger();
      setPrevScore(score);
    }
  }, [score]);

  // Trigger success animation on correct feedback
  useEffect(() => {
    if (feedback && (feedback.includes('✅') || feedback.includes('🎉'))) {
      successAnim.trigger();
    }
  }, [feedback]);

  // Manual detection for testing
  const handleManualDetection = () => {
    if (onWordCompleted) {
      onWordCompleted(targetWord);
    }
  };

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
            Please grant camera access to use Word Detection Mode
          </Text>
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 20 }]}
            onPress={async () => {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert(
                  'Permission Denied',
                  'Camera access is required for Word Detection Mode. Please enable it in your device settings.',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            <Text style={styles.submitButtonText}>REQUEST PERMISSION</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.brutalWhite, marginTop: 12 }]}
            onPress={onExitGame}
          >
            <Text style={[styles.submitButtonText, { color: colors.brutalBlack }]}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fullScreen}>
      {/* Camera View */}
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
          {/* Top Bar Overlay */}
          <Animated.View style={styles.topBar} entering={FadeIn.duration(500).delay(200)}>
            <AnimatedTouchableOpacity
              style={styles.topButton}
              onPress={onExitGame}
              entering={ZoomIn.duration(400).delay(300)}
            >
              <Text style={styles.topButtonText}>← BACK</Text>
            </AnimatedTouchableOpacity>

            <Animated.View style={styles.topCenter} entering={FadeIn.duration(600).delay(400)}>
              <Text style={styles.topScoreLabel}>LV{userLevel} | {score}</Text>
              <Text style={styles.topRoundLabel}>Round {round + 1}</Text>
              {/* Floating score indicator */}
              {score > prevScore && (
                <Animated.View style={[styles.floatingScore, floatingScoreAnim.animatedStyle]}>
                  <Text style={styles.floatingScoreText}>+{gameMode === 'challenge' ? 50 : 25}</Text>
                </Animated.View>
              )}
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
              <Text style={styles.cameraLoadingText}>📷 Starting camera...</Text>
            </View>
          )}

          {/* Feedback Overlay */}
          {feedback && (
            <Animated.View
              style={styles.feedbackOverlayCenter}
              entering={ZoomIn.duration(300).springify()}
              exiting={FadeOut.duration(500)}
            >
              <Animated.View
                style={[
                  styles.feedbackCard,
                  successAnim.animatedStyle,
                  {
                    backgroundColor:
                      feedback.includes('✅') || feedback.includes('🎉')
                        ? colors.brutalGreen
                        : feedback.includes('⏭️')
                        ? colors.brutalYellow
                        : colors.brutalRed,
                  },
                ]}
              >
                <Text style={styles.feedbackOverlayText}>{feedback}</Text>
              </Animated.View>
            </Animated.View>
          )}
        </CameraView>
      </View>

      {/* Bottom Content Area */}
      <View style={styles.bottomContentArea}>
        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.brutalGreen : colors.brutalYellow }]} />
          <Text style={styles.statusText}>
            {isConnected ? '✓ AI Word Detection Active' : '⚡ Manual Mode'}
          </Text>
        </View>

        {/* Target Word Display */}
        <Animated.View
          style={[styles.wordCard, wordPulse]}
          entering={ZoomIn.duration(400).delay(100)}
        >
          <Text style={styles.wordLabel}>SIGN THIS WORD:</Text>
          <Text style={styles.targetWord}>{targetWord || 'Loading...'}</Text>
        </Animated.View>

        {/* Confidence Meter */}
        {isConnected && (
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>
              CONFIDENCE: {(currentConfidence * 100).toFixed(0)}%
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${currentConfidence * 100}%`,
                    backgroundColor: currentConfidence >= 0.75 ? colors.brutalGreen : colors.brutalYellow
                  }
                ]}
              />
            </View>
            {detectedWord && detectedWord !== targetWord && (
              <Text style={styles.detectedWordText}>
                Detecting: {detectedWord}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <AnimatedTouchableOpacity
            style={[
              styles.detectButton,
              isDetecting && styles.detectButtonDisabled,
              detectButtonAnim.animatedStyle,
            ]}
            onPress={handleManualDetection}
            onPressIn={detectButtonAnim.handlePressIn}
            onPressOut={detectButtonAnim.handlePressOut}
            disabled={isDetecting}
            activeOpacity={1}
            entering={ZoomIn.duration(400).delay(200)}
          >
            <Text style={styles.detectButtonText}>
              {isDetecting ? 'DETECTING...' : '✋ DETECT WORD'}
            </Text>
          </AnimatedTouchableOpacity>

          {gameMode === 'practice' && (
            <AnimatedTouchableOpacity
              style={styles.hintButton}
              onPress={() => Alert.alert('Hint', `Try signing: ${targetWord.split('').join(' - ')}`)}
              entering={ZoomIn.duration(400).delay(300)}
            >
              <Text style={styles.hintButtonText}>💡 HINT</Text>
            </AnimatedTouchableOpacity>
          )}
        </View>
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
  fullScreen: {
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    minWidth: 80,
  },
  topButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  topCenter: {
    alignItems: 'center',
    flex: 0,
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

  // Bottom Content
  bottomContentArea: {
    flex: 0.4,
    backgroundColor: colors.brutalWhite,
    padding: 16,
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

  // Word Card
  wordCard: {
    backgroundColor: colors.brutalPurple,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    alignItems: 'center',
  },
  wordLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    letterSpacing: 1,
    marginBottom: 8,
  },
  targetWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    letterSpacing: 2,
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
  },
  detectedWordText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  // Button Container
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  // Detect Button
  detectButton: {
    flex: 1,
    backgroundColor: colors.brutalBlue,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Hint Button
  hintButton: {
    backgroundColor: colors.brutalYellow,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
  },

  // Floating score
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
    fontWeight: 'bold',
    color: colors.brutalWhite,
  },
});

export default WordGameScreen;