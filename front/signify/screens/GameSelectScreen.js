import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/colors';
import { useTheme } from '../context/ThemeContext';
import { useThemedColors, useThemedShadow } from '../hooks/useThemedColors';
import { NBIcon } from '../components/NeoBrutalistIcons';
import signConfig from '../config/signRecognition';

const GameSelectScreen = ({ onSelectMode, userStats = {} }) => {
  const { isDarkMode } = useTheme();
  const themedColors = useThemedColors();
  const shadowStyle = useThemedShadow('large');
  const [detectionMode, setDetectionMode] = useState('letter');
  const [showConstructionModal, setShowConstructionModal] = useState(false);
  const toggleAnimation = useSharedValue(0);

  // Load saved detection mode preference
  useEffect(() => {
    loadDetectionMode();
  }, []);

  const loadDetectionMode = async () => {
    try {
      // Always default to 'letter' mode
      setDetectionMode('letter');
      toggleAnimation.value = 0;
      // Update the config
      signConfig.recognition.defaultMode = 'letter';
    } catch (error) {
      console.error('Error loading detection mode:', error);
    }
  };

  const handleToggleMode = () => {
    // Show "Under Construction" modal when user tries to toggle
    setShowConstructionModal(true);
  };

  // Animated styles for toggle
  const toggleSliderStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withSpring(toggleAnimation.value * 28, {
          damping: 15,
          stiffness: 150
        })}
      ]
    };
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.brutalWhite }]}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <NBIcon name="GamePad" size={36} color={themedColors.brutalBlack} />
            <Text style={[styles.title, { color: themedColors.brutalBlack }]}>GAME ZONE</Text>
          </View>
          <Text style={[styles.subtitle, { color: themedColors.brutalBlack }]}>
            Choose your challenge and start playing!
          </Text>
        </View>

        {/* Detection Mode Toggle */}
        <View style={[
          styles.toggleCard,
          {
            backgroundColor: themedColors.brutalWhite,
            borderColor: themedColors.brutalBlack,
            ...shadowStyle,
          }
        ]}>
          <Text style={[styles.toggleTitle, { color: themedColors.brutalBlack }]}>DETECTION MODE</Text>

          <View style={styles.toggleRow}>
            <Text style={[
              styles.toggleLabel,
              { color: detectionMode === 'letter' ? themedColors.brutalBlack : themedColors.brutalGray },
            ]}>
              LETTER
            </Text>

            <TouchableOpacity
              style={[
                styles.toggleContainer,
                {
                  backgroundColor: themedColors.brutalBlue,
                  borderColor: themedColors.brutalBlack,
                }
              ]}
              onPress={handleToggleMode}
              activeOpacity={0.8}
            >
              <Animated.View style={[
                styles.toggleSlider,
                {
                  backgroundColor: themedColors.brutalWhite,
                  borderColor: themedColors.brutalBlack,
                }
                , toggleSliderStyle
              ]} />
            </TouchableOpacity>

            <Text style={[
              styles.toggleLabel,
              { color: detectionMode === 'word' ? themedColors.brutalBlack : themedColors.brutalGray },
            ]}>
              WORD
            </Text>
          </View>
        </View>

        {/* Quiz Mode Card */}
        <TouchableOpacity
          style={[
            styles.modeCard,
            {
              backgroundColor: themedColors.brutalBlue,
              borderColor: themedColors.brutalBlack,
              ...shadowStyle,
            }
          ]}
          activeOpacity={0.9}
          onPress={() => onSelectMode(detectionMode === 'word' ? 'word' : 'quiz')}
        >
          <View style={styles.modeIcon}>
            <NBIcon name="Brain" size={48} color={isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite} />
          </View>
          <Text style={[styles.modeTitle, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>
            QUIZ MODE
          </Text>
          <Text style={[styles.modeDescription, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>
            {detectionMode === 'word'
              ? 'Guess the word from a hint! Sign the complete word using ASL.'
              : 'Guess the word from a hint! Sign using ASL to spell your answer letter by letter.'}
          </Text>
        </TouchableOpacity>

        {/* SignSpeed Card */}
        <TouchableOpacity
          style={[
            styles.modeCard,
            {
              backgroundColor: themedColors.brutalGreen,
              borderColor: themedColors.brutalBlack,
              ...shadowStyle,
            }
          ]}
          activeOpacity={0.9}
          onPress={() => onSelectMode('speed')}
        >
          <View style={styles.modeIcon}>
            <NBIcon name="Lightning" size={48} color={isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite} />
          </View>
          <Text style={[styles.modeTitle, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>
            SIGNSPEED
          </Text>
          <Text style={[styles.modeDescription, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>
            {detectionMode === 'word'
              ? 'Race against time! Sign complete words as fast as you can. Beat the 30-second timer!'
              : 'Race against time! Fingerspell words letter by letter. Beat the 30-second timer!'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Under Construction Modal */}
      <Modal
        visible={showConstructionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConstructionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: themedColors.brutalWhite,
              borderColor: themedColors.brutalBlack,
              ...shadowStyle,
            }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalIcon, { color: themedColors.brutalBlack }]}>🚧</Text>
              <Text style={[styles.modalTitle, { color: themedColors.brutalBlack }]}>
                UNDER CONSTRUCTION
              </Text>
            </View>
            <Text style={[styles.modalMessage, { color: themedColors.brutalBlack }]}>
              Word mode is currently under development. Stay tuned for updates!
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: themedColors.brutalBlue,
                  borderColor: themedColors.brutalBlack,
                }
              ]}
              onPress={() => setShowConstructionModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalButtonText, { color: themedColors.brutalWhite }]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Sora-ExtraBold',
    color: colors.brutalBlack,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
    marginTop: 8,
  },

  // Mode Cards
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    marginBottom: 12,
    letterSpacing: 1,
  },
  modeDescription: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalWhite,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Toggle Card
  toggleCard: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: 'Sora-Bold',
    color: colors.brutalGray,
    letterSpacing: 0.5,
    marginHorizontal: 12,
  },
  toggleLabelActive: {
    color: colors.brutalBlack,
  },
  toggleContainer: {
    width: 56,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brutalBlue,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    padding: 2,
    justifyContent: 'center',
    overflow: 'hidden', // Prevent clipping
  },
  toggleSlider: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brutalWhite,
    borderWidth: 2,
    borderColor: colors.brutalBlack,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.brutalWhite,
    borderWidth: 4,
    borderColor: colors.brutalBlack,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: colors.brutalBlue,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    padding: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    letterSpacing: 0.5,
  },
});

export default GameSelectScreen;