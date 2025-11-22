import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { colors } from '../styles/colors';

const QuizPreviewScreen = ({
  quizQuestion,
  quizScore,
  quizRound,
  userLevelQuiz,
  onStartGame,
  onGoBack
}) => {
  const [permission, requestPermission] = useCameraPermissions();

  const handleStartGame = async () => {
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
    onStartGame();
  };

  if (!quizQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.gameHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
            <Text style={styles.backButtonText}>← BACK</Text>
          </TouchableOpacity>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{quizScore}</Text>
          </View>
        </View>

        <Text style={styles.gameTitle}>QUIZ MODE</Text>
        <Text style={styles.gameSubtitle}>Level {userLevelQuiz} - Round {quizRound + 1}</Text>

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
          onPress={handleStartGame}
          activeOpacity={0.9}
        >
          <Text style={styles.submitButtonText}>START</Text>
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
    fontWeight: 'bold',
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
  instructionText: {
    fontSize: 14,
    fontFamily: 'monospace',
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
    fontWeight: 'bold',
    color: colors.brutalWhite,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default QuizPreviewScreen;