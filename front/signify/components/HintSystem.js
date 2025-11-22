import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { colors } from '../styles/colors';
import { ASL_HINTS, getProgressiveHint } from '../data/aslHints';
import { ASLIcon } from './ASLIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Floating Hint Button Component
export const HintButton = ({
  onPress,
  isStruggling,
  attemptsCount = 0,
  style
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(null);
  const glowAnimation = useRef(null);

  useEffect(() => {
    if (isStruggling) {
      // Pulse animation when struggling - use non-native driver to match glow
      pulseAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: false, // Changed to false to avoid conflict
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false, // Changed to false to avoid conflict
          }),
        ])
      );
      pulseAnimation.current.start();

      // Glow animation
      glowAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimation.current.start();
    } else {
      // Stop animations when not struggling
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
        pulseAnim.setValue(1);
      }
      if (glowAnimation.current) {
        glowAnimation.current.stop();
        glowAnim.setValue(0);
      }
    }

    return () => {
      // Cleanup animations on unmount
      if (pulseAnimation.current) pulseAnimation.current.stop();
      if (glowAnimation.current) glowAnimation.current.stop();
    };
  }, [isStruggling, pulseAnim, glowAnim]);

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.brutalYellow]
  });

  return (
    <Animated.View
      style={[
        styles.hintButton,
        style,
        {
          transform: [{ scale: pulseAnim }],
          borderColor: isStruggling ? glowColor : colors.brutalBlack,
          borderWidth: isStruggling ? 4 : 3,
        }
      ]}
    >
      <TouchableOpacity onPress={onPress} style={styles.hintButtonInner}>
        <Text style={styles.hintButtonEmoji}>💡</Text>
        {isStruggling && attemptsCount > 2 && (
          <View style={styles.hintBadge}>
            <Text style={styles.hintBadgeText}>!</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Quick Hint Popup Component
export const QuickHint = ({
  letter,
  visible,
  onClose,
  hintLevel = 1
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  if (!visible || !letter) return null;

  const hint = getProgressiveHint(letter, hintLevel);
  if (!hint) return null;

  return (
    <Animated.View
      style={[
        styles.quickHintContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }
      ]}
    >
      <View style={styles.quickHintContent}>
        <View style={styles.quickHintHeader}>
          <ASLIcon letter={letter} size={80} color={colors.brutalBlack} />
          <View style={styles.quickHintTextContainer}>
            <Text style={styles.quickHintLetter}>{letter}</Text>
            <Text style={styles.quickHintText}>{hint.text}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// Full Hint Modal Component
export const HintModal = ({
  letter,
  visible,
  onClose,
  showAllDetails = false
}) => {
  const [currentHintLevel, setCurrentHintLevel] = useState(1);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!letter) return null;

  const fullHint = ASL_HINTS[letter.toUpperCase()];
  const progressiveHint = getProgressiveHint(letter, currentHintLevel);

  if (!fullHint) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>LETTER {letter}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Main Hint Display */}
            <View style={styles.hintMainSection}>
              <ASLIcon letter={letter} size={150} color={colors.brutalBlack} />

              <Text style={styles.hintBigLetter}>{letter}</Text>

              <Text style={styles.hintDescription}>{fullHint.description}</Text>

              <View style={styles.hintMemoryCard}>
                <Text style={styles.hintMemoryText}>{fullHint.mnemonic}</Text>
              </View>

              {/* Simple instruction cards */}
              <View style={styles.simpleInstructions}>
                <View style={styles.instructionCard}>
                  <Text style={styles.instructionLabel}>HAND</Text>
                  <Text style={styles.instructionText}>{fullHint.handShape}</Text>
                </View>

                <View style={styles.instructionCard}>
                  <Text style={styles.instructionLabel}>THUMB</Text>
                  <Text style={styles.instructionText}>{fullHint.thumbPosition}</Text>
                </View>
              </View>

              {/* Movement if exists */}
              {fullHint.movement && (
                <View style={styles.movementCard}>
                  <Text style={styles.movementText}>✋ {fullHint.movement}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onClose}
            >
              <Text style={styles.actionButtonText}>GOT IT!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Inline Mini Hint Component
export const MiniHint = ({ letter, style }) => {
  if (!letter) return null;

  const hint = ASL_HINTS[letter.toUpperCase()];
  if (!hint) return null;

  return (
    <View style={[styles.miniHint, style]}>
      <ASLIcon letter={letter} size={40} color={colors.brutalBlack} />
    </View>
  );
};

const styles = StyleSheet.create({
  // Hint Button Styles
  hintButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    backgroundColor: colors.brutalYellow,
    borderRadius: 28,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  hintButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintButtonEmoji: {
    fontSize: 28,
  },
  hintBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    backgroundColor: colors.brutalRed,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintBadgeText: {
    color: colors.brutalWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Quick Hint Styles
  quickHintContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: colors.brutalWhite,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    zIndex: 1000,
  },
  quickHintContent: {
    padding: 16,
  },
  quickHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quickHintTextContainer: {
    flex: 1,
  },
  quickHintLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    letterSpacing: 2,
  },
  quickHintText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: colors.brutalWhite,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 4,
    borderBottomColor: colors.brutalBlack,
    backgroundColor: colors.brutalBlue,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    letterSpacing: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.brutalWhite,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brutalBlack,
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  modalBody: {
    padding: 20,
  },

  // Hint Content Styles
  hintMainSection: {
    alignItems: 'center',
  },
  hintBigLetter: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    letterSpacing: 4,
    marginTop: 16,
    marginBottom: 8,
  },
  hintDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
    marginBottom: 16,
  },
  hintMemoryCard: {
    backgroundColor: colors.brutalYellow,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    marginBottom: 20,
  },
  hintMemoryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
  },
  simpleInstructions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  instructionCard: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    padding: 12,
    alignItems: 'center',
  },
  instructionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    opacity: 0.6,
    marginBottom: 4,
    letterSpacing: 1,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    textAlign: 'center',
  },
  movementCard: {
    backgroundColor: colors.brutalGreen,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
  },
  movementText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
  },
  visualCueBox: {
    backgroundColor: colors.brutalGray,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    marginTop: 8,
  },
  visualCueText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: colors.brutalBlack,
    textAlign: 'center',
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  detailCard: {
    width: '48%',
    backgroundColor: colors.brutalWhite,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    padding: 12,
    marginBottom: 12,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    opacity: 0.6,
    marginBottom: 4,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },

  // Difficulty Badge
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    alignSelf: 'flex-start',
  },
  difficultyEasy: {
    backgroundColor: colors.brutalGreen,
  },
  difficultyMedium: {
    backgroundColor: colors.brutalYellow,
  },
  difficultyHard: {
    backgroundColor: colors.brutalRed,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },

  // Movement Section
  movementSection: {
    margin: 16,
    padding: 12,
    backgroundColor: colors.brutalYellow,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
  },
  movementLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 4,
  },
  movementText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },

  // Mistakes Section
  mistakesSection: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderWidth: 2,
    borderColor: colors.brutalRed,
  },
  mistakesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalRed,
    marginBottom: 8,
    letterSpacing: 1,
  },
  mistakeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mistakeBullet: {
    color: colors.brutalRed,
    marginRight: 8,
    fontWeight: 'bold',
  },
  mistakeText: {
    flex: 1,
    fontSize: 14,
    color: colors.brutalBlack,
  },

  // Hint Levels
  hintLevels: {
    margin: 16,
  },
  hintLevelsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.brutalBlack,
    marginBottom: 8,
    letterSpacing: 1,
  },
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: colors.brutalWhite,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: colors.brutalBlue,
  },
  levelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.brutalBlack,
  },
  levelButtonTextActive: {
    color: colors.brutalWhite,
  },

  // Modal Actions
  modalActions: {
    padding: 16,
    borderTopWidth: 4,
    borderTopColor: colors.brutalBlack,
  },
  actionButton: {
    backgroundColor: colors.brutalGreen,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brutalWhite,
    letterSpacing: 1,
  },

  // Mini Hint
  miniHint: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brutalYellow,
    padding: 10,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    borderRadius: 12,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
});

export default {
  HintButton,
  QuickHint,
  HintModal,
  MiniHint
};