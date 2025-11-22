import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const ThemeWrapper = ({ children, style }) => {
  const { isDarkMode } = useTheme();

  // Apply the 'dark' class to enable Tailwind dark mode classes
  return (
    <View
      className={isDarkMode ? 'dark' : ''}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </View>
  );
};