import React from 'react';
import { Text, ActivityIndicator, View, TouchableWithoutFeedback } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../styles/colors';

const NBButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon = null,
  className = '',
  textClassName = '',
  ...props
}) => {
  const { isDarkMode } = useTheme();

  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const shadowOpacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: shadowOpacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withTiming(0.97, { duration: 80 });
      translateX.value = withTiming(3, { duration: 80 });
      translateY.value = withTiming(3, { duration: 80 });
      shadowOpacity.value = withTiming(0, { duration: 80 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withTiming(1, { duration: 100 });
      translateX.value = withTiming(0, { duration: 100 });
      translateY.value = withTiming(0, { duration: 100 });
      shadowOpacity.value = withTiming(1, { duration: 100 });
    }
  };
  const getVariantClasses = () => {
    const variants = {
      primary: isDarkMode
        ? 'bg-brutal-dark-blue border-brutal-dark-border'
        : 'bg-brutal-blue border-brutal-black',
      secondary: isDarkMode
        ? 'bg-brutal-dark-surface border-brutal-dark-border'
        : 'bg-brutal-white border-brutal-black',
      danger: isDarkMode
        ? 'bg-brutal-dark-red border-brutal-dark-border'
        : 'bg-brutal-red border-brutal-black',
      success: isDarkMode
        ? 'bg-brutal-dark-green border-brutal-dark-border'
        : 'bg-brutal-green border-brutal-black',
      warning: isDarkMode
        ? 'bg-brutal-dark-yellow border-brutal-dark-border'
        : 'bg-brutal-yellow border-brutal-black',
    };
    return variants[variant] || variants.primary;
  };

  const getTextColorClass = () => {
    const textColors = {
      primary: isDarkMode ? 'text-brutal-dark-white' : 'text-brutal-white',
      secondary: isDarkMode ? 'text-brutal-dark-text' : 'text-brutal-black',
      danger: isDarkMode ? 'text-brutal-dark-white' : 'text-brutal-white',
      success: isDarkMode ? 'text-brutal-dark-white' : 'text-brutal-white',
      warning: 'text-brutal-black',
    };
    return textColors[variant] || textColors.primary;
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'px-4 py-2',
      medium: 'px-6 py-3',
      large: 'px-8 py-4',
      full: 'px-6 py-3 w-full',
    };
    return sizes[size] || sizes.medium;
  };

  const getTextSizeClass = () => {
    const textSizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
      full: 'text-base',
    };
    return textSizes[size] || textSizes.medium;
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
    >
      <Animated.View
        style={[animatedStyle]}
        className={`
          ${getVariantClasses()}
          ${getSizeClasses()}
          border-brutal
          flex-row
          items-center
          justify-center
          ${isDisabled ? 'opacity-50' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Shadow layer */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 6,
              left: 6,
              right: -6,
              bottom: -6,
              backgroundColor: isDarkMode ? colors.dark.brutalShadow : '#000000',
              borderRadius: 0,
              zIndex: -1,
            },
            shadowStyle
          ]}
        />

        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' || variant === 'warning' ? '#000000' : '#FFFFFF'}
          />
        ) : (
          <View className="flex-row items-center gap-2">
            {icon && icon}
            <Text
              className={`
                font-bold
                ${getTextColorClass()}
                ${getTextSizeClass()}
                ${textClassName}
              `}
            >
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default NBButton;