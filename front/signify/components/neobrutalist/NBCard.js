import React from 'react';
import { View, Text } from 'react-native';

const NBCard = ({
  children,
  title,
  subtitle,
  variant = 'default',
  padding = 'medium',
  className = '',
  ...props
}) => {
  const getVariantClasses = () => {
    const variants = {
      default: 'bg-brutal-white',
      primary: 'bg-brutal-blue',
      secondary: 'bg-brutal-gray',
      warning: 'bg-brutal-yellow',
      error: 'bg-brutal-red',
      success: 'bg-brutal-green',
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
    const isDark = variant === 'primary' || variant === 'error' || variant === 'success';
    return isDark ? 'text-brutal-white' : 'text-brutal-black';
  };

  return (
    <View
      className={`
        ${getVariantClasses()}
        ${getPaddingClasses()}
        border-brutal
        border-brutal-black
        shadow-brutal
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