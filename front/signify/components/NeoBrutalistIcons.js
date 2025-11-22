import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Line, G } from 'react-native-svg';
import { useThemedColors } from '../hooks/useThemedColors';

// Neo-brutalist style icons with bold lines and simple shapes
export const NeoBrutalistIcons = {
  // Trophy icon for leaderboard
  Trophy: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 8V6C5 5 5 4 6 4H18C19 4 19 5 19 6V8C19 10 17 12 15 12H14V16H17V20H7V16H10V12H9C7 12 5 10 5 8Z"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <Circle cx="12" cy="10" r="1.5" fill={fillColor} />
      </Svg>
    );
  },

  // Lightning bolt for speed games
  Lightning: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
      </Svg>
    );
  },

  // Brain icon for quiz
  Brain: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 3C9 3 7 5 7 7C5 7 3 9 3 11C3 13 5 15 7 15C7 17 9 19 11 19V21H13V19C15 19 17 17 17 15C19 15 21 13 21 11C21 9 19 7 17 7C17 5 15 3 12 3Z"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <Line x1="9" y1="10" x2="9" y2="13" stroke={fillColor} strokeWidth="2" />
        <Line x1="15" y1="10" x2="15" y2="13" stroke={fillColor} strokeWidth="2" />
      </Svg>
    );
  },

  // Star for achievements
  Star: ({ size = 24, color = null, filled = false }) => {
    const themedColors = useThemedColors();
    const strokeColor = color || themedColors.brutalBlack;
    const fillColor = filled ? (color || themedColors.brutalYellow) : 'none';

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Polygon
          points="12,2 15,9 22,9 16.5,14 19,21 12,16 5,21 7.5,14 2,9 9,9"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill={fillColor}
        />
      </Svg>
    );
  },

  // Game controller
  GamePad: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="8" width="18" height="10" rx="2"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          fill="none"
        />
        <Line x1="8" y1="11" x2="8" y2="15" stroke={fillColor} strokeWidth="2" />
        <Line x1="6" y1="13" x2="10" y2="13" stroke={fillColor} strokeWidth="2" />
        <Circle cx="15" cy="12" r="1" fill={fillColor} />
        <Circle cx="17" cy="14" r="1" fill={fillColor} />
      </Svg>
    );
  },

  // Target for goals
  Target: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke={fillColor} strokeWidth="3" fill="none" />
        <Circle cx="12" cy="12" r="6" stroke={fillColor} strokeWidth="2" fill="none" />
        <Circle cx="12" cy="12" r="3" stroke={fillColor} strokeWidth="2" fill="none" />
        <Circle cx="12" cy="12" r="1" fill={fillColor} />
      </Svg>
    );
  },

  // Fire for streaks
  Fire: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2C12 2 9 7 9 10C7 10 5 12 5 15C5 18 8 21 12 21C16 21 19 18 19 15C19 12 17 10 15 10C15 7 12 2 12 2Z"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
      </Svg>
    );
  },

  // Medal for ranks
  Medal: ({ size = 24, color = null, rank = 1 }) => {
    const themedColors = useThemedColors();
    const strokeColor = color || themedColors.brutalBlack;
    const medalColors = {
      1: themedColors.brutalYellow,
      2: themedColors.brutalGray,
      3: '#CD7F32' // Bronze
    };

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="14" r="7"
          stroke={strokeColor}
          strokeWidth="3"
          fill={medalColors[rank] || 'none'}
        />
        <Path d="M8 3L8 10M16 3L16 10" stroke={strokeColor} strokeWidth="2" />
        <Text x="12" y="18" fontSize="10" fontWeight="bold" textAnchor="middle" fill={strokeColor}>
          {rank}
        </Text>
      </Svg>
    );
  },

  // Hand for ASL
  Hand: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7 12V4C7 3 8 2 9 2C10 2 11 3 11 4V10M11 10V3C11 2 12 1 13 1C14 1 15 2 15 3V10M15 10V4C15 3 16 2 17 2C18 2 19 3 19 4V12L19 18C19 20 17 22 15 22H11C9 22 7 20 7 18V15"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <Path d="M5 12C5 11 6 10 7 10C8 10 9 11 9 12V14" stroke={fillColor} strokeWidth="2" />
      </Svg>
    );
  },

  // Checkmark
  Check: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalGreen;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12L10 17L19 7"
          stroke={fillColor}
          strokeWidth="4"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </Svg>
    );
  },

  // X mark
  Cross: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalRed;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Line x1="6" y1="6" x2="18" y2="18" stroke={fillColor} strokeWidth="4" strokeLinecap="square" />
        <Line x1="18" y1="6" x2="6" y2="18" stroke={fillColor} strokeWidth="4" strokeLinecap="square" />
      </Svg>
    );
  },

  // Arrow icons
  ArrowRight: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12H19M19 12L13 6M19 12L13 18"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </Svg>
    );
  },

  // Settings gear
  Settings: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <G>
          <Rect x="10" y="2" width="4" height="4" fill={fillColor} />
          <Rect x="10" y="18" width="4" height="4" fill={fillColor} />
          <Rect x="2" y="10" width="4" height="4" fill={fillColor} />
          <Rect x="18" y="10" width="4" height="4" fill={fillColor} />
          <Rect x="5" y="5" width="3" height="3" fill={fillColor} />
          <Rect x="16" y="5" width="3" height="3" fill={fillColor} />
          <Rect x="5" y="16" width="3" height="3" fill={fillColor} />
          <Rect x="16" y="16" width="3" height="3" fill={fillColor} />
          <Circle cx="12" cy="12" r="4" stroke={fillColor} strokeWidth="3" fill="none" />
        </G>
      </Svg>
    );
  },

  // Help/Lightbulb icon for hint button
  Help: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalYellow;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M9 18H15V20C15 21 14 22 12 22C10 22 9 21 9 20V18Z"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <Path
          d="M9 18C7 17 5 15 5 12C5 8 8 5 12 5C16 5 19 8 19 12C19 15 17 17 15 18"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <Line x1="10" y1="20" x2="14" y2="20" stroke={fillColor} strokeWidth="2" />
        <Circle cx="12" cy="12" r="2" fill={fillColor} />
      </Svg>
    );
  },

  // Skip icon for skip button
  Skip: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalBlack;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 5V19L17 12L5 5Z"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <Line x1="19" y1="5" x2="19" y2="19" stroke={fillColor} strokeWidth="3" strokeLinecap="square" />
      </Svg>
    );
  },

  // Celebration/Success icon
  Celebrate: ({ size = 24, color = null }) => {
    const themedColors = useThemedColors();
    const fillColor = color || themedColors.brutalGreen;

    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="15" width="6" height="6" rx="1"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          fill="none"
        />
        <Rect x="15" y="15" width="6" height="6" rx="1"
          stroke={fillColor}
          strokeWidth="3"
          strokeLinecap="square"
          fill="none"
        />
        <Path
          d="M9 15C9 15 10 10 12 10C14 10 15 15 15 15"
          stroke={fillColor}
          strokeWidth="2"
          strokeLinecap="square"
        />
        <Circle cx="6" cy="5" r="1" fill={fillColor} />
        <Circle cx="18" cy="5" r="1" fill={fillColor} />
        <Circle cx="12" cy="3" r="1" fill={fillColor} />
        <Circle cx="4" cy="10" r="1" fill={fillColor} />
        <Circle cx="20" cy="10" r="1" fill={fillColor} />
      </Svg>
    );
  }
};

// Helper component to use icons easily
export const NBIcon = ({ name, ...props }) => {
  const Icon = NeoBrutalistIcons[name];
  return Icon ? <Icon {...props} /> : null;
};