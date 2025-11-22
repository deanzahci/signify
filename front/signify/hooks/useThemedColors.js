import { useTheme } from '../context/ThemeContext';
import { colors } from '../styles/colors';

export const useThemedColors = () => {
  const { isDarkMode } = useTheme();

  // Return dark colors if dark mode is enabled, otherwise return light colors
  if (isDarkMode) {
    return {
      ...colors,
      ...colors.dark,
      // Map the standard color names to dark variants
      brutalBlue: colors.dark.brutalBlue,
      brutalBlueDark: colors.dark.brutalBlueDark,
      brutalBlack: colors.dark.brutalBlack,
      brutalWhite: colors.dark.brutalWhite,
      brutalGray: colors.dark.brutalGray,
      brutalYellow: colors.dark.brutalYellow,
      brutalRed: colors.dark.brutalRed,
      brutalGreen: colors.dark.brutalGreen,
      brutalPurple: colors.dark.brutalPurple,
    };
  }

  return colors;
};

// Helper function to get shadow style based on theme
export const useThemedShadow = (size = 'medium') => {
  const { isDarkMode } = useTheme();
  const themedColors = useThemedColors();

  const shadows = {
    small: {
      shadowColor: isDarkMode ? themedColors.brutalShadow : colors.brutalBlack,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    medium: {
      shadowColor: isDarkMode ? themedColors.brutalShadow : colors.brutalBlack,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    large: {
      shadowColor: isDarkMode ? themedColors.brutalShadow : colors.brutalBlack,
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 6,
    },
    xlarge: {
      shadowColor: isDarkMode ? themedColors.brutalShadow : colors.brutalBlack,
      shadowOffset: { width: 8, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 8,
    },
  };

  return shadows[size] || shadows.medium;
};