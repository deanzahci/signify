import React from 'react';
import { View, Text } from 'react-native';

const NBDivider = ({
  label = '',
  variant = 'default',
  thickness = 'medium',
  className = '',
}) => {
  const getThicknessClass = () => {
    const thicknesses = {
      thin: 'h-0.5',
      medium: 'h-1',
      thick: 'h-2',
    };
    return thicknesses[thickness] || thicknesses.medium;
  };

  const getColorClass = () => {
    const colors = {
      default: 'bg-brutal-black',
      light: 'bg-brutal-gray',
      primary: 'bg-brutal-blue',
    };
    return colors[variant] || colors.default;
  };

  if (label) {
    return (
      <View className={`flex-row items-center my-4 ${className}`}>
        <View className={`flex-1 ${getThicknessClass()} ${getColorClass()}`} />
        <Text className="mx-4 font-mono text-sm text-brutal-black">
          {label}
        </Text>
        <View className={`flex-1 ${getThicknessClass()} ${getColorClass()}`} />
      </View>
    );
  }

  return (
    <View
      className={`${getThicknessClass()} ${getColorClass()} my-4 ${className}`}
    />
  );
};

export default NBDivider;