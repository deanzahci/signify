import React from 'react';
import { View, Text } from 'react-native';

const NBBadge = ({
  text,
  variant = 'primary',
  size = 'medium',
  className = '',
}) => {
  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-brutal-blue',
      secondary: 'bg-brutal-gray',
      success: 'bg-brutal-green',
      warning: 'bg-brutal-yellow',
      danger: 'bg-brutal-red',
      dark: 'bg-brutal-black',
    };
    return variants[variant] || variants.primary;
  };

  const getTextColor = () => {
    const isDark = ['primary', 'success', 'danger', 'dark'].includes(variant);
    return isDark ? 'text-brutal-white' : 'text-brutal-black';
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'px-2 py-1',
      medium: 'px-3 py-1.5',
      large: 'px-4 py-2',
    };
    return sizes[size] || sizes.medium;
  };

  const getTextSize = () => {
    const textSizes = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };
    return textSizes[size] || textSizes.medium;
  };

  return (
    <View
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        border-2
        border-brutal-black
        shadow-brutal-sm
        self-start
        ${className}
      `}
    >
      <Text
        className={`
          ${getTextColor()}
          ${getTextSize()}
          font-bold
        `}
      >
        {text}
      </Text>
    </View>
  );
};

export default NBBadge;