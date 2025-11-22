import React from 'react';
import Svg, { Path, G, Circle, Line, Rect, Ellipse } from 'react-native-svg';
import { colors } from '../styles/colors';

// Base hand component for consistent sizing
const HandBase = ({ children, size = 60, color = colors.brutalBlack, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" {...props}>
    <G strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </G>
  </Svg>
);

// ASL Letter Icons - Actual hand sign representations
export const ASLIcons = {
  A: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Fist with thumb alongside */}
      <G>
        <Path
          d="M30 60 Q30 40, 40 35 L60 35 Q70 40, 70 60 L70 75 Q65 80, 50 80 Q35 80, 30 75 Z"
          fill={color}
          stroke={color}
          strokeWidth="3"
        />
        {/* Thumb on side */}
        <Rect x="26" y="45" width="12" height="20" rx="4" fill={color} />
        {/* Knuckle details */}
        <Line x1="40" y1="45" x2="40" y2="50" stroke="white" strokeWidth="2" />
        <Line x1="50" y1="45" x2="50" y2="50" stroke="white" strokeWidth="2" />
        <Line x1="60" y1="45" x2="60" y2="50" stroke="white" strokeWidth="2" />
      </G>
    </HandBase>
  ),

  B: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Flat hand with thumb tucked */}
      <G>
        <Path
          d="M35 25 L35 70 Q35 75, 40 75 L60 75 Q65 75, 65 70 L65 25 Q65 20, 60 20 L40 20 Q35 20, 35 25 Z"
          fill={color}
          stroke={color}
          strokeWidth="2"
        />
        {/* Four fingers */}
        <Line x1="42" y1="25" x2="42" y2="70" stroke="white" strokeWidth="1" />
        <Line x1="48" y1="25" x2="48" y2="70" stroke="white" strokeWidth="1" />
        <Line x1="54" y1="25" x2="54" y2="70" stroke="white" strokeWidth="1" />
        <Line x1="60" y1="25" x2="60" y2="70" stroke="white" strokeWidth="1" />
        {/* Thumb folded across */}
        <Path
          d="M35 50 Q30 48, 30 55 Q30 62, 35 60"
          fill={color}
          stroke={color}
          strokeWidth="3"
        />
      </G>
    </HandBase>
  ),

  C: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Curved C shape */}
      <G>
        <Path
          d="M65 30 Q45 20, 30 35 Q25 45, 30 55 Q45 70, 65 60"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Fingertips */}
        <Circle cx="65" cy="30" r="6" fill={color} />
        <Circle cx="65" cy="60" r="6" fill={color} />
      </G>
    </HandBase>
  ),

  D: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Index finger up, others touching thumb */}
      <G>
        {/* Index finger pointing up */}
        <Rect x="45" y="20" width="10" height="35" rx="5" fill={color} />
        {/* Closed fingers */}
        <Path
          d="M35 55 Q35 50, 40 50 L60 50 Q65 50, 65 55 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
        {/* Thumb touching fingers */}
        <Circle cx="38" cy="55" r="5" fill={color} />
        <Line x1="38" y1="55" x2="45" y2="55" stroke={color} strokeWidth="3" />
      </G>
    </HandBase>
  ),

  E: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Bent fingers with thumb underneath */}
      <G>
        {/* Curved fingers */}
        <Path
          d="M35 40 Q35 30, 45 30 L55 30 Q65 30, 65 40 L65 50 Q65 65, 50 65 Q35 65, 35 50 Z"
          fill={color}
        />
        {/* Finger curves */}
        <Path
          d="M40 35 Q40 45, 42 50"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        <Path
          d="M50 35 Q50 45, 50 50"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        <Path
          d="M60 35 Q60 45, 58 50"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        {/* Thumb underneath */}
        <Ellipse cx="50" cy="60" rx="15" ry="5" fill={color} />
      </G>
    </HandBase>
  ),

  F: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* OK sign - thumb and index making circle, three fingers up */}
      <G>
        {/* Three fingers up */}
        <Rect x="45" y="20" width="8" height="30" rx="4" fill={color} />
        <Rect x="55" y="20" width="8" height="30" rx="4" fill={color} />
        <Rect x="65" y="20" width="8" height="30" rx="4" fill={color} />
        {/* Circle made by thumb and index */}
        <Circle cx="35" cy="55" r="12" fill="none" stroke={color} strokeWidth="6" />
        {/* Connection to hand */}
        <Path
          d="M45 50 Q40 50, 35 55"
          fill="none"
          stroke={color}
          strokeWidth="6"
        />
      </G>
    </HandBase>
  ),

  G: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Pointing sideways with thumb parallel */}
      <G transform="rotate(-90 50 50)">
        {/* Index finger pointing */}
        <Rect x="45" y="20" width="10" height="35" rx="5" fill={color} />
        {/* Thumb parallel */}
        <Rect x="35" y="25" width="8" height="25" rx="4" fill={color} />
        {/* Closed fingers */}
        <Path
          d="M40 55 Q40 50, 45 50 L55 50 Q60 50, 60 55 L60 65 Q55 70, 50 70 Q45 70, 40 65 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  H: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Two fingers horizontal */}
      <G transform="rotate(-90 50 50)">
        {/* Index and middle fingers */}
        <Rect x="40" y="25" width="8" height="35" rx="4" fill={color} />
        <Rect x="52" y="25" width="8" height="35" rx="4" fill={color} />
        {/* Closed fingers */}
        <Path
          d="M40 60 Q40 55, 45 55 L55 55 Q60 55, 60 60 L60 70 Q55 75, 50 75 Q45 75, 40 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  I: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Pinky up */}
      <G>
        {/* Pinky finger up */}
        <Rect x="62" y="20" width="8" height="30" rx="4" fill={color} />
        {/* Closed fist */}
        <Path
          d="M30 50 Q30 45, 35 45 L60 45 Q65 45, 65 50 L65 70 Q60 75, 50 75 Q35 75, 30 70 Z"
          fill={color}
        />
        {/* Thumb across */}
        <Rect x="28" y="55" width="20" height="6" rx="3" fill={color} />
      </G>
    </HandBase>
  ),

  J: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Pinky with J motion */}
      <G>
        {/* J shape path */}
        <Path
          d="M62 20 L62 50 Q62 60, 52 60 Q45 60, 45 55"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Arrow indicating movement */}
        <Path
          d="M45 55 L42 52 M45 55 L42 58"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Closed fist */}
        <Path
          d="M30 50 Q30 45, 35 45 L55 45 Q60 45, 60 50 L60 70 Q55 75, 45 75 Q35 75, 30 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  K: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Peace sign with thumb between */}
      <G>
        {/* Index and middle up */}
        <Rect x="40" y="20" width="8" height="30" rx="4" fill={color} />
        <Rect x="52" y="20" width="8" height="30" rx="4" fill={color} />
        {/* Thumb between fingers */}
        <Ellipse cx="50" cy="45" rx="6" ry="4" fill={color} />
        {/* Closed fingers */}
        <Path
          d="M35 50 Q35 45, 40 45 L60 45 Q65 45, 65 50 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  L: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* L shape with thumb and index */}
      <G>
        {/* Index finger up */}
        <Rect x="43" y="15" width="14" height="40" rx="7" fill={color} />
        {/* Thumb out to side */}
        <Rect x="15" y="43" width="35" height="14" rx="7" fill={color} />
        {/* Closed fingers */}
        <Path
          d="M45 55 Q45 50, 50 50 L60 50 Q65 50, 65 55 L65 70 Q60 75, 52 75 Q45 75, 45 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  M: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Three fingers over thumb */}
      <G>
        {/* Thumb underneath */}
        <Rect x="30" y="60" width="35" height="8" rx="4" fill={color} />
        {/* Three fingers down over thumb */}
        <Path
          d="M35 35 Q35 30, 40 30 L60 30 Q65 30, 65 35 L65 60 Q60 65, 50 65 Q40 65, 35 60 Z"
          fill={color}
        />
        {/* Finger divisions */}
        <Line x1="43" y1="35" x2="43" y2="55" stroke="white" strokeWidth="1" />
        <Line x1="50" y1="35" x2="50" y2="55" stroke="white" strokeWidth="1" />
        <Line x1="57" y1="35" x2="57" y2="55" stroke="white" strokeWidth="1" />
        {/* Pinky up slightly */}
        <Rect x="62" y="28" width="6" height="20" rx="3" fill={color} />
      </G>
    </HandBase>
  ),

  N: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Two fingers over thumb */}
      <G>
        {/* Thumb underneath */}
        <Rect x="30" y="60" width="30" height="8" rx="4" fill={color} />
        {/* Two fingers down over thumb */}
        <Path
          d="M35 35 Q35 30, 40 30 L55 30 Q60 30, 60 35 L60 60 Q55 65, 47 65 Q40 65, 35 60 Z"
          fill={color}
        />
        {/* Finger divisions */}
        <Line x1="43" y1="35" x2="43" y2="55" stroke="white" strokeWidth="1" />
        <Line x1="52" y1="35" x2="52" y2="55" stroke="white" strokeWidth="1" />
        {/* Ring and pinky up */}
        <Rect x="58" y="28" width="6" height="20" rx="3" fill={color} />
        <Rect x="66" y="28" width="6" height="20" rx="3" fill={color} />
      </G>
    </HandBase>
  ),

  O: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Circle with all fingers */}
      <G>
        <Circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth="12" />
        {/* Small gap to show it's fingers */}
        <Path
          d="M50 30 Q52 28, 54 30"
          fill="none"
          stroke="white"
          strokeWidth="3"
        />
      </G>
    </HandBase>
  ),

  P: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* K tilted down */}
      <G transform="rotate(45 50 50)">
        {/* Index and middle down */}
        <Rect x="40" y="20" width="8" height="30" rx="4" fill={color} />
        <Rect x="52" y="20" width="8" height="30" rx="4" fill={color} />
        {/* Thumb between */}
        <Ellipse cx="50" cy="45" rx="6" ry="4" fill={color} />
        {/* Closed fingers */}
        <Path
          d="M35 50 Q35 45, 40 45 L60 45 Q65 45, 65 50 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  Q: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* G pointing down */}
      <G transform="rotate(90 50 50)">
        {/* Index finger pointing */}
        <Rect x="45" y="20" width="10" height="35" rx="5" fill={color} />
        {/* Thumb parallel */}
        <Rect x="35" y="25" width="8" height="25" rx="4" fill={color} />
        {/* Closed fingers */}
        <Path
          d="M40 55 Q40 50, 45 50 L55 50 Q60 50, 60 55 L60 65 Q55 70, 50 70 Q45 70, 40 65 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  R: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Crossed fingers */}
      <G>
        {/* Index finger */}
        <Rect x="42" y="20" width="8" height="35" rx="4" fill={color} />
        {/* Middle finger crossed over */}
        <Path
          d="M52 20 Q58 35, 48 50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Closed fingers */}
        <Path
          d="M35 55 Q35 50, 40 50 L60 50 Q65 50, 65 55 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  S: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Fist with thumb over fingers */}
      <G>
        {/* Closed fist */}
        <Path
          d="M30 45 Q30 35, 40 35 L60 35 Q70 35, 70 45 L70 65 Q65 75, 50 75 Q35 75, 30 65 Z"
          fill={color}
        />
        {/* Thumb across fingers */}
        <Path
          d="M28 50 Q28 45, 33 45 L65 45 Q70 45, 70 50 L70 55 Q65 58, 50 58 Q33 58, 28 55 Z"
          fill={color}
        />
        {/* Knuckle details */}
        <Line x1="40" y1="40" x2="40" y2="45" stroke="white" strokeWidth="1" />
        <Line x1="50" y1="40" x2="50" y2="45" stroke="white" strokeWidth="1" />
        <Line x1="60" y1="40" x2="60" y2="45" stroke="white" strokeWidth="1" />
      </G>
    </HandBase>
  ),

  T: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Thumb between index and middle */}
      <G>
        {/* Closed fist base */}
        <Path
          d="M30 45 Q30 35, 40 35 L60 35 Q70 35, 70 45 L70 65 Q65 75, 50 75 Q35 75, 30 65 Z"
          fill={color}
        />
        {/* Thumb sticking between fingers */}
        <Rect x="45" y="30" width="10" height="25" rx="5" fill={color} />
        {/* Finger gap indication */}
        <Line x1="43" y1="40" x2="43" y2="50" stroke="white" strokeWidth="1" />
        <Line x1="57" y1="40" x2="57" y2="50" stroke="white" strokeWidth="1" />
      </G>
    </HandBase>
  ),

  U: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Two fingers together up */}
      <G>
        {/* Index and middle together */}
        <Path
          d="M44 20 Q44 18, 46 18 L54 18 Q56 18, 56 20 L56 50 Q54 52, 50 52 Q46 52, 44 50 Z"
          fill={color}
        />
        {/* Line showing fingers together */}
        <Line x1="50" y1="25" x2="50" y2="45" stroke="white" strokeWidth="1" />
        {/* Closed fingers */}
        <Path
          d="M35 50 Q35 45, 40 45 L60 45 Q65 45, 65 50 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  V: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Peace sign */}
      <G>
        {/* Index finger */}
        <Path
          d="M42 20 L45 50"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Middle finger */}
        <Path
          d="M58 20 L55 50"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Closed fingers */}
        <Path
          d="M35 50 Q35 45, 40 45 L60 45 Q65 45, 65 50 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  W: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Three fingers spread */}
      <G>
        {/* Index */}
        <Path
          d="M38 20 L40 50"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Middle */}
        <Path
          d="M50 18 L50 50"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Ring */}
        <Path
          d="M62 20 L60 50"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Closed fingers */}
        <Path
          d="M35 50 Q35 45, 40 45 L60 45 Q65 45, 65 50 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  X: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Hooked index finger */}
      <G>
        {/* Hooked index */}
        <Path
          d="M50 20 Q50 35, 45 40 Q42 42, 42 45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Hook detail */}
        <Circle cx="45" cy="40" r="3" fill="white" />
        {/* Closed fingers */}
        <Path
          d="M35 50 Q35 45, 40 45 L60 45 Q65 45, 65 50 L65 70 Q60 75, 50 75 Q40 75, 35 70 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  Y: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Thumb and pinky out (shaka) */}
      <G>
        {/* Thumb out */}
        <Path
          d="M25 45 Q20 45, 20 50 Q20 55, 25 55 L35 55"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Pinky out */}
        <Path
          d="M65 35 Q70 35, 75 40 Q75 45, 70 45 L65 45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Closed middle fingers */}
        <Path
          d="M35 45 Q35 40, 40 40 L60 40 Q65 40, 65 45 L65 65 Q60 70, 50 70 Q40 70, 35 65 Z"
          fill={color}
        />
      </G>
    </HandBase>
  ),

  Z: ({ size = 60, color = colors.brutalBlack }) => (
    <HandBase size={size} color={color}>
      {/* Z motion with index */}
      <G>
        {/* Z path */}
        <Path
          d="M35 30 L65 30 L35 60 L65 60"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow showing motion */}
        <Path
          d="M65 60 L62 57 M65 60 L62 63"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Index finger */}
        <Circle cx="50" cy="45" r="5" fill={color} />
      </G>
    </HandBase>
  ),
};

// Helper component to get icon by letter
export const ASLIcon = ({ letter, size = 60, color = colors.brutalBlack, style }) => {
  const IconComponent = ASLIcons[letter?.toUpperCase()];

  if (!IconComponent) {
    // Fallback for unknown letters
    return (
      <HandBase size={size} color={color} style={style}>
        <Text style={{ fontSize: size * 0.6, textAlign: 'center' }}>?</Text>
      </HandBase>
    );
  }

  return <IconComponent size={size} color={color} style={style} />;
};

export default ASLIcon;