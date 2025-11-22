import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const DetectionDisplay = ({
  isConnected,
  currentDetection,
  confidence,
  targetValue,
  isCorrect
}) => {
  const { isDarkMode } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when correct
  useEffect(() => {
    if (isCorrect) {
      // Start glowing
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false
      }).start();

      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();
      };
    }
  }, [isCorrect]);

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.offlineBox}>
          <Text style={styles.offlineTitle}>WebSocket Offline</Text>
          <Text style={styles.offlineMessage}>
            Backend not connected - using manual detection
          </Text>
        </View>
      </View>
    );
  }

  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;
  const isHighConfidence = confidence >= 0.8;

  // Determine display color based on state
  const getStatusColor = () => {
    if (isDarkMode) {
      // Vibrant colors for dark mode that pop while maintaining readability
      if (isCorrect) return '#00CC00'; // Vibrant green when correct
      if (isHighConfidence && currentDetection === targetValue) return '#32CD32'; // Lime green when matching
      if (isHighConfidence) return '#FF8C00'; // Dark orange for high confidence wrong letter
      return '#ffffff'; // White for low confidence
    } else {
      // Original bright colors for light mode
      if (isCorrect) return '#00ff00'; // Bright green when correct
      if (isHighConfidence && currentDetection === targetValue) return '#90EE90'; // Light green when matching
      if (isHighConfidence) return '#FFA500'; // Orange for high confidence wrong letter
      return '#ffffff'; // White for low confidence
    }
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.2)', isDarkMode ? '#00CC00' : '#00ff00']
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.detectionBox,
          {
            borderColor: borderColor,
            transform: [{ scale: pulseAnim }],
            shadowColor: isCorrect ? (isDarkMode ? '#00CC00' : '#00ff00') : '#000',
            shadowOpacity: isCorrect ? 0.8 : 0.3,
            shadowRadius: isCorrect ? 20 : 5,
          }
        ]}
      >
        <Text style={styles.label}>Detecting:</Text>
        <Text style={[styles.detection, { color: getStatusColor() }]}>
          {currentDetection || '—'}
        </Text>
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${confidencePercent}%`,
                  backgroundColor: getStatusColor()
                }
              ]}
            />
          </View>
          <Text style={[styles.confidenceText, { color: getStatusColor() }]}>
            {confidencePercent}%
          </Text>
        </View>
        {isCorrect && (
          <Text style={[styles.correctText, { color: isDarkMode ? '#00CC00' : '#00ff00' }]}>CORRECT!</Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  detectionBox: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    borderWidth: 2,
    padding: 15,
    minWidth: 200,
    alignItems: 'center',
    elevation: 5,
  },
  offlineBox: {
    backgroundColor: 'rgba(255,0,0,0.2)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ff6b6b',
    padding: 15,
    minWidth: 200,
    alignItems: 'center',
  },
  offlineTitle: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  offlineMessage: {
    color: '#ffaaaa',
    fontSize: 14,
    textAlign: 'center',
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 5,
  },
  detection: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  confidenceContainer: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
  },
  confidenceBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  correctText: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
});

export default DetectionDisplay;