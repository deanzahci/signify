import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { colors } from '../styles/colors';
import { useTheme } from '../context/ThemeContext';
import { useThemedColors, useThemedShadow } from '../hooks/useThemedColors';
import { NBIcon } from '../components/NeoBrutalistIcons';

const SpeedPreviewScreen = ({
  quizQuestion,
  typingScore,
  currentWordIndex,
  typingWords,
  userLevelSpeed,
  typingTimer,
  onStartGame,
  onGoBack
}) => {
  const { isDarkMode } = useTheme();
  const themedColors = useThemedColors();
  const shadowStyle = useThemedShadow('medium');
  const [permission, requestPermission] = useCameraPermissions();

  const handleStartGame = async () => {
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
    onStartGame();
  };

  if (!quizQuestion) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themedColors.brutalWhite }]}>
        <NBIcon name="Lightning" size={48} color={themedColors.brutalBlack} />
        <Text style={[styles.loadingText, { color: themedColors.brutalBlack }]}>Loading words...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.brutalWhite }]}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.gameHeader}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: themedColors.brutalWhite,
                borderColor: themedColors.brutalBlack,
                ...shadowStyle
              }
            ]}
            onPress={onGoBack}
          >
            <Text style={[styles.backButtonText, { color: themedColors.brutalBlack }]}>← BACK</Text>
          </TouchableOpacity>
          <View style={[
            styles.scoreContainer,
            {
              backgroundColor: themedColors.brutalYellow,
              borderColor: themedColors.brutalBlack,
              ...shadowStyle
            }
          ]}>
            <Text style={[styles.scoreLabel, { color: themedColors.brutalBlack }]}>SCORE</Text>
            <Text style={[styles.scoreValue, { color: themedColors.brutalBlack }]}>{typingScore}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <NBIcon name="Lightning" size={36} color={themedColors.brutalBlack} />
          <Text style={[styles.gameTitle, { color: themedColors.brutalBlack }]}>SIGNSPEED</Text>
        </View>
        <Text style={[styles.gameSubtitle, { color: themedColors.brutalBlack }]}>Level {userLevelSpeed} - Word {currentWordIndex + 1}/{typingWords.length}</Text>

        {/* Mode Description Card */}
        <View style={[
          styles.quizCard,
          {
            backgroundColor: themedColors.brutalGreen,
            borderColor: themedColors.brutalBlack,
            marginBottom: 20,
            ...shadowStyle
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <NBIcon name="Target" size={20} color={isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite} />
            <Text style={[
              styles.quizCardLabel,
              { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite, marginLeft: 8 }
            ]}>ABOUT SIGNSPEED</Text>
          </View>
          <Text style={[styles.instructionText, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite, marginTop: 8 }]}>
            • Race against the {typingTimer}-second timer{'\n'}
            • Sign each word letter by letter{'\n'}
            • Letters and words are shown{'\n'}
            • Complete as many words as you can!
          </Text>
        </View>

        {/* Timer Info Card */}
        <View style={[
          styles.quizCard,
          {
            backgroundColor: themedColors.brutalYellow,
            borderColor: themedColors.brutalBlack,
            marginBottom: 20,
            ...shadowStyle
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <NBIcon name="Lightning" size={20} color={themedColors.brutalBlack} />
            <Text style={[styles.quizCardLabel, { color: themedColors.brutalBlack, marginLeft: 8 }]}>TIMER</Text>
          </View>
          <Text style={[styles.quizLetterCount, { fontSize: 48, color: themedColors.brutalBlack }]}>{typingTimer} seconds</Text>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: themedColors.brutalGreen,
              borderColor: themedColors.brutalBlack,
              ...shadowStyle
            }
          ]}
          onPress={handleStartGame}
          activeOpacity={0.9}
        >
          <Text style={[styles.submitButtonText, { color: isDarkMode ? themedColors.brutalBlack : themedColors.brutalWhite }]}>START</Text>
        </TouchableOpacity>
      </ScrollView>
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

  // Game Header
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
    fontFamily: 'Sora-Bold',
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
  },
  gameTitle: {
    fontSize: 28,
    fontFamily: 'Sora-Bold',
    color: colors.brutalBlack,
    marginBottom: 8,
    letterSpacing: 1,
  },
  gameSubtitle: {
    fontSize: 16,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
    marginBottom: 24,
  },

  // Quiz Cards
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
  instructionText: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: colors.brutalBlack,
    lineHeight: 24,
    marginBottom: 20,
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
    fontFamily: 'Sora-Bold',
    color: colors.brutalWhite,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default SpeedPreviewScreen;