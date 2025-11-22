// Animation utilities for smooth, polished animations using react-native-reanimated
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';

// Spring configurations for different animation types
export const springConfigs = {
  gentle: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 0.8,
  },
  stiff: {
    damping: 20,
    stiffness: 200,
    mass: 1,
  },
  wobbly: {
    damping: 8,
    stiffness: 180,
    mass: 0.5,
  },
};

// Timing configurations
export const timingConfigs = {
  fast: {
    duration: 200,
    easing: Easing.out(Easing.quad),
  },
  smooth: {
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  slow: {
    duration: 500,
    easing: Easing.inOut(Easing.quad),
  },
};

// Hook for button press animations
export const useButtonPressAnimation = (haptic = true) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
  }));

  const triggerHaptic = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressIn = () => {
    'worklet';
    scale.value = withTiming(0.97, { duration: 100 });
    translateY.value = withTiming(2, { duration: 100 });
    runOnJS(triggerHaptic)();
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withTiming(1, { duration: 100 });
    translateY.value = withTiming(0, { duration: 100 });
  };

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut,
  };
};

// Hook for card entrance animations
export const useEntranceAnimation = (delay = 0, direction = 'up') => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(direction === 'up' ? 50 : -50);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, timingConfigs.smooth)
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, springConfigs.gentle)
    );
    scale.value = withDelay(
      delay,
      withSpring(1, springConfigs.gentle)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value }
    ],
  }));

  return animatedStyle;
};

// Hook for success animations (checkmark, correct answer)
export const useSuccessAnimation = () => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  const trigger = () => {
    'worklet';
    opacity.value = 1;
    scale.value = withSequence(
      withSpring(1.2, springConfigs.bouncy),
      withSpring(1, springConfigs.gentle)
    );
    rotation.value = withSequence(
      withTiming(10, { duration: 100 }),
      withSpring(0, springConfigs.wobbly)
    );
    runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
  };

  const reset = () => {
    'worklet';
    scale.value = 0;
    opacity.value = 0;
    rotation.value = 0;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  return { animatedStyle, trigger, reset };
};

// Hook for error/shake animations
export const useShakeAnimation = () => {
  const translateX = useSharedValue(0);

  const shake = () => {
    'worklet';
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Error);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { animatedStyle, shake };
};

// Hook for pulse animations (timer warnings, attention)
export const usePulseAnimation = (active = true) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      // Cancel any ongoing animations and immediately reset to default values
      scale.value = 1;
      opacity.value = 1;
      // Then apply a smooth transition to ensure the values are properly set
      scale.value = withTiming(1, { duration: 0 });
      opacity.value = withTiming(1, { duration: 0 });
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return animatedStyle;
};

// Hook for progress bar animations
export const useProgressAnimation = (progress) => {
  const width = useSharedValue(0);
  const backgroundColor = useSharedValue('#00CC66');

  useEffect(() => {
    width.value = withSpring(progress * 100, springConfigs.gentle);

    // Change color based on progress
    if (progress < 0.3) {
      backgroundColor.value = withTiming('#FF3333', timingConfigs.fast);
    } else if (progress < 0.7) {
      backgroundColor.value = withTiming('#FFD93D', timingConfigs.fast);
    } else {
      backgroundColor.value = withTiming('#00CC66', timingConfigs.fast);
    }
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: backgroundColor.value,
  }));

  return animatedStyle;
};

// Hook for floating score animations
export const useFloatingAnimation = () => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  const trigger = () => {
    'worklet';
    opacity.value = 1;
    scale.value = withSpring(1, springConfigs.bouncy);
    translateY.value = withTiming(-50, { duration: 1000 });
    opacity.value = withDelay(
      200,
      withTiming(0, { duration: 800 })
    );
  };

  const reset = () => {
    'worklet';
    translateY.value = 0;
    opacity.value = 0;
    scale.value = 0.5;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  return { animatedStyle, trigger, reset };
};

// Hook for tab indicator animations
export const useTabIndicatorAnimation = (activeIndex, itemCount) => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    const itemWidth = 100 / itemCount;
    translateX.value = withSpring(
      activeIndex * itemWidth,
      springConfigs.gentle
    );
  }, [activeIndex, itemCount]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value}%` }],
    width: `${100 / itemCount}%`,
  }));

  return animatedStyle;
};

// Hook for counter animations (score, stats)
export const useCounterAnimation = (value, duration = 1000) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration });
  }, [value]);

  return animatedValue;
};

// Hook for stagger animations (list items)
export const useStaggerAnimation = (index, total, reverse = false) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reverse ? -30 : 30);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    const delay = index * 50; // 50ms between each item

    opacity.value = withDelay(
      delay,
      withTiming(1, timingConfigs.smooth)
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, springConfigs.gentle)
    );
    scale.value = withDelay(
      delay,
      withSpring(1, springConfigs.gentle)
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  return animatedStyle;
};

// Hook for glow/shadow animations
export const useGlowAnimation = (active = false, color = '#0066FF') => {
  const shadowOpacity = useSharedValue(0);
  const shadowRadius = useSharedValue(0);

  useEffect(() => {
    if (active) {
      shadowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      );
      shadowRadius.value = withRepeat(
        withSequence(
          withTiming(20, { duration: 1000 }),
          withTiming(10, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      shadowOpacity.value = withTiming(0, timingConfigs.fast);
      shadowRadius.value = withTiming(0, timingConfigs.fast);
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowColor: color,
    shadowOpacity: shadowOpacity.value,
    shadowRadius: shadowRadius.value,
    shadowOffset: { width: 0, height: 0 },
    elevation: interpolate(
      shadowRadius.value,
      [0, 20],
      [0, 10],
      Extrapolation.CLAMP
    ),
  }));

  return animatedStyle;
};

// Export all hooks and configs
export default {
  springConfigs,
  timingConfigs,
  useButtonPressAnimation,
  useEntranceAnimation,
  useSuccessAnimation,
  useShakeAnimation,
  usePulseAnimation,
  useProgressAnimation,
  useFloatingAnimation,
  useTabIndicatorAnimation,
  useCounterAnimation,
  useStaggerAnimation,
  useGlowAnimation,
};