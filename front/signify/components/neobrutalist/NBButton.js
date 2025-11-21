import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

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
  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-brutal-blue border-brutal-black',
      secondary: 'bg-brutal-white border-brutal-black',
      danger: 'bg-brutal-red border-brutal-black',
      success: 'bg-brutal-green border-brutal-black',
      warning: 'bg-brutal-yellow border-brutal-black',
    };
    return variants[variant] || variants.primary;
  };

  const getTextColorClass = () => {
    const textColors = {
      primary: 'text-brutal-white',
      secondary: 'text-brutal-black',
      danger: 'text-brutal-white',
      success: 'text-brutal-white',
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
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        border-brutal
        shadow-brutal
        flex-row
        items-center
        justify-center
        ${!isDisabled ? 'active:translate-x-1 active:translate-y-1 active:shadow-none' : 'opacity-50'}
        ${className}
      `}
      {...props}
    >
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
    </TouchableOpacity>
  );
};

export default NBButton;