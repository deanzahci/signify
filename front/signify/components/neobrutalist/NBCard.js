import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const NBCard = ({
  children,
  title,
  subtitle,
  variant = 'default',
  padding = 'medium',
  className = '',
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const getVariantClasses = () => {
    const variants = {
      default: isDarkMode ? 'bg-brutal-dark-surface' : 'bg-brutal-white',
      primary: isDarkMode ? 'bg-brutal-dark-blue' : 'bg-brutal-blue',
      secondary: isDarkMode ? 'bg-brutal-dark-gray' : 'bg-brutal-gray',
      warning: isDarkMode ? 'bg-brutal-dark-yellow' : 'bg-brutal-yellow',
      error: isDarkMode ? 'bg-brutal-dark-red' : 'bg-brutal-red',
      success: isDarkMode ? 'bg-brutal-dark-green' : 'bg-brutal-green',
    };
    return variants[variant] || variants.default;
  };

  const getPaddingClasses = () => {
    const paddings = {
      none: 'p-0',
      small: 'p-3',
      medium: 'p-4',
      large: 'p-6',
    };
    return paddings[padding] || paddings.medium;
  };

  const getTitleColor = () => {
    const isDarkVariant = variant === 'primary' || variant === 'error' || variant === 'success';
    if (isDarkMode) {
      return isDarkVariant ? 'text-brutal-dark-white' : 'text-brutal-dark-text';
    }
    return isDarkVariant ? 'text-brutal-white' : 'text-brutal-black';
  };

  return (
    <View
      className={`
        ${getVariantClasses()}
        ${getPaddingClasses()}
        border-brutal
        ${isDarkMode ? 'border-brutal-dark-border shadow-brutal-dark' : 'border-brutal-black shadow-brutal'}
        ${className}
      `}
      {...props}
    >
      {title && (
        <View className="mb-3">
          <Text className={`font-bold text-lg ${getTitleColor()}`}>
            {title}
          </Text>
          {subtitle && (
            <Text className={`text-sm ${getTitleColor()} opacity-80 mt-1`}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
};

export default NBCard;