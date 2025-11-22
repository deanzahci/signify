// ASL Hint Data with Hand Sign Representations
// Using text-based representations for clean, aesthetic hints

export const ASL_HINTS = {
  // Letters with visual representations and instructions
  A: {
    handIcon: 'FIST',
    description: 'Make a fist with thumb alongside',
    handShape: 'Closed fist',
    thumbPosition: 'Side of fist',
    difficulty: 'easy',
    mnemonic: 'A for Apple in your fist',
    commonMistakes: ['Thumb too high', 'Fingers not tight'],
    visualCue: `
      ___
     |   |
     | A |
     |___|
     [FIST]
    `
  },
  B: {
    handIcon: 'FLAT',
    description: 'Flat hand, thumb tucked',
    handShape: 'Flat palm',
    thumbPosition: 'Folded across palm',
    difficulty: 'easy',
    mnemonic: 'B for Board - flat like a board',
    commonMistakes: ['Thumb sticking out', 'Fingers spread'],
    visualCue: `
      ||||
      ||||
      ||||
      [FLAT]
    `
  },
  C: {
    handIcon: 'CURVE',
    description: 'Curved hand like letter C',
    handShape: 'Curved fingers',
    thumbPosition: 'Curved with fingers',
    difficulty: 'easy',
    mnemonic: 'C for Cup - shape of holding a cup',
    commonMistakes: ['Too open', 'Too closed'],
    visualCue: `
       ___
      (
       ___
      [C]
    `
  },
  D: {
    handIcon: 'INDEX_UP',
    description: 'Index up, others touch thumb',
    handShape: 'Index finger up',
    thumbPosition: 'Touching middle, ring, pinky',
    difficulty: 'medium',
    mnemonic: 'D for Direction - pointing up',
    commonMistakes: ['Middle finger not touching thumb', 'Index not straight'],
    visualCue: `
       |
       |
      (_)
      [D]
    `
  },
  E: {
    handIcon: 'BENT',
    description: 'Fingers bent, thumb tucked under',
    handShape: 'Bent fingers',
    thumbPosition: 'Under fingertips',
    difficulty: 'medium',
    mnemonic: 'E for Eagle claw',
    commonMistakes: ['Thumb visible', 'Fingers too straight'],
    visualCue: `
      ___
     (___)
      [E]
    `
  },
  F: {
    handIcon: 'OK_SIGN',
    description: 'OK sign (circle with thumb & index)',
    handShape: 'Three fingers up',
    thumbPosition: 'Touching index tip',
    difficulty: 'medium',
    mnemonic: 'F for Fine - like "OK" or "Fine"',
    commonMistakes: ['Circle not closed', 'Other fingers down'],
    visualCue: `
      |||
      O-|
      [F]
    `
  },
  G: {
    handIcon: 'POINT',
    description: 'Point sideways, thumb parallel',
    handShape: 'Sideways point',
    thumbPosition: 'Parallel to index',
    difficulty: 'hard',
    mnemonic: 'G for Go - pointing the way to go',
    commonMistakes: ['Thumb not parallel', 'Wrong angle'],
    visualCue: `
      →→
      👉
    `
  },
  H: {
    handIcon: 'PEACE',
    description: 'Two fingers horizontal',
    handShape: 'Peace sign sideways',
    thumbPosition: 'Holding down ring & pinky',
    difficulty: 'hard',
    mnemonic: 'H has two lines - show two fingers',
    commonMistakes: ['Fingers vertical', 'Thumb visible'],
    visualCue: `
      ==
      ✌️
    `
  },
  I: {
    handIcon: 'SHAKA',
    description: 'Pinky up, fist closed',
    handShape: 'Fist with pinky up',
    thumbPosition: 'Across fingers',
    difficulty: 'easy',
    mnemonic: 'I for I (me) - pinky promise to myself',
    commonMistakes: ['Thumb out', 'Other fingers loose'],
    visualCue: `
       |
      (_)
      🤙
    `
  },
  J: {
    handIcon: 'SHAKA',
    description: 'Draw J with pinky',
    handShape: 'I handshape',
    thumbPosition: 'Same as I',
    difficulty: 'hard',
    mnemonic: 'J for Jump - pinky jumps in J shape',
    movement: 'Draw J in air',
    commonMistakes: ['No movement', 'Wrong direction'],
    visualCue: `
       |
       ↪
      🤙
    `
  },
  K: {
    handIcon: 'PEACE',
    description: 'Peace sign with thumb between',
    handShape: 'Index & middle up',
    thumbPosition: 'Between two fingers',
    difficulty: 'hard',
    mnemonic: 'K for Kick - fingers kick up with thumb',
    commonMistakes: ['Thumb not between', 'Fingers together'],
    visualCue: `
      |^|
      ✌️
    `
  },
  L: {
    handIcon: 'ILY',
    description: 'L shape with thumb and index',
    handShape: 'L shape',
    thumbPosition: 'Out to side',
    difficulty: 'easy',
    mnemonic: 'L for L-shape - makes an L',
    commonMistakes: ['Wrong angle', 'Other fingers out'],
    visualCue: `
      |__
      🤟
    `
  },
  M: {
    handIcon: 'SIDE_FIST',
    description: 'Three fingers over thumb',
    handShape: 'Three fingers down',
    thumbPosition: 'Under three fingers',
    difficulty: 'hard',
    mnemonic: 'M has three humps - three fingers',
    commonMistakes: ['Four fingers', 'Thumb visible'],
    visualCue: `
      |||
      (_)
      🤛
    `
  },
  N: {
    handIcon: 'SIDE_FIST',
    description: 'Two fingers over thumb',
    handShape: 'Two fingers down',
    thumbPosition: 'Under two fingers',
    difficulty: 'medium',
    mnemonic: 'N has two humps - two fingers',
    commonMistakes: ['Three fingers', 'Thumb out'],
    visualCue: `
      ||
      (_)
      🤛
    `
  },
  O: {
    handIcon: 'CIRCLE',
    description: 'Make an O with all fingers',
    handShape: 'Circle shape',
    thumbPosition: 'Meeting fingertips',
    difficulty: 'easy',
    mnemonic: 'O for circle - make a circle',
    commonMistakes: ['Not round', 'Gap in circle'],
    visualCue: `
      ⭕
    `
  },
  P: {
    handIcon: 'POINT_DOWN',
    description: 'K tilted down',
    handShape: 'Like K but pointing down',
    thumbPosition: 'Between fingers',
    difficulty: 'hard',
    mnemonic: 'P for Point down',
    commonMistakes: ['Not tilted enough', 'Wrong thumb position'],
    visualCue: `
      ↓↓
      👇
    `
  },
  Q: {
    handIcon: 'POINT_DOWN',
    description: 'G pointing down',
    handShape: 'Like G but down',
    thumbPosition: 'Parallel pointing down',
    difficulty: 'hard',
    mnemonic: 'Q for Question - pointing down questioning',
    commonMistakes: ['Not angled right', 'Thumb wrong'],
    visualCue: `
      ↓→
      👇
    `
  },
  R: {
    handIcon: 'CROSSED',
    description: 'Cross middle over index',
    handShape: 'Crossed fingers',
    thumbPosition: 'Holding others',
    difficulty: 'medium',
    mnemonic: 'R for cRossed fingers',
    commonMistakes: ['Wrong fingers crossed', 'Too loose'],
    visualCue: `
      X
      🤞
    `
  },
  S: {
    handIcon: 'FIST',
    description: 'Fist with thumb over fingers',
    handShape: 'Closed fist',
    thumbPosition: 'Across fingers',
    difficulty: 'easy',
    mnemonic: 'S for Strong fist',
    commonMistakes: ['Thumb under fingers', 'Too loose'],
    visualCue: `
      ___
      [FIST]
    `
  },
  T: {
    handIcon: 'THUMBS_UP',
    description: 'Thumb between index and middle',
    handShape: 'Fist shape',
    thumbPosition: 'Between first two fingers',
    difficulty: 'medium',
    mnemonic: 'T for Thumb tucked',
    commonMistakes: ['Thumb too high', 'Thumb too low'],
    visualCue: `
      _|_
      👍
    `
  },
  U: {
    handIcon: 'PEACE',
    description: 'Two fingers together up',
    handShape: 'Two fingers up',
    thumbPosition: 'Holding others',
    difficulty: 'easy',
    mnemonic: 'U looks like two fingers',
    commonMistakes: ['Fingers spread', 'Thumb out'],
    visualCue: `
      ||
      ✌️
    `
  },
  V: {
    handIcon: 'PEACE',
    description: 'Peace sign (fingers spread)',
    handShape: 'Two fingers spread',
    thumbPosition: 'Holding others',
    difficulty: 'easy',
    mnemonic: 'V for Victory sign',
    commonMistakes: ['Fingers together', 'Wrong angle'],
    visualCue: `
      \\/
      ✌️
    `
  },
  W: {
    handIcon: 'ILY',
    description: 'Three fingers up spread',
    handShape: 'Three fingers spread',
    thumbPosition: 'Holding pinky',
    difficulty: 'easy',
    mnemonic: 'W has three points up',
    commonMistakes: ['Fingers together', 'Four fingers'],
    visualCue: `
      \\|/
      🤟
    `
  },
  X: {
    handIcon: 'INDEX_UP',
    description: 'Index finger bent like hook',
    handShape: 'Hooked index',
    thumbPosition: 'Holding others',
    difficulty: 'medium',
    mnemonic: 'X marks the spot - hooked finger',
    commonMistakes: ['Too straight', 'Wrong finger'],
    visualCue: `
      ⌒
      [D]
    `
  },
  Y: {
    handIcon: 'SHAKA',
    description: 'Thumb and pinky out',
    handShape: 'Shaka sign',
    thumbPosition: 'Extended out',
    difficulty: 'easy',
    mnemonic: 'Y for Yo! (shaka)',
    commonMistakes: ['Other fingers out', 'Not spread enough'],
    visualCue: `
      \\__/
      🤙
    `
  },
  Z: {
    handIcon: 'INDEX_UP',
    description: 'Draw Z with index finger',
    handShape: 'Index pointing',
    thumbPosition: 'Holding others',
    difficulty: 'hard',
    mnemonic: 'Z for Zigzag - draw a Z',
    movement: 'Draw Z in air',
    commonMistakes: ['No movement', 'Wrong pattern'],
    visualCue: `
      /\\/
      [D]
    `
  }
};

// Helper function to get hint by difficulty
export const getHintsByDifficulty = (difficulty) => {
  return Object.entries(ASL_HINTS)
    .filter(([_, hint]) => hint.difficulty === difficulty)
    .map(([letter, hint]) => ({ letter, ...hint }));
};

// Helper function to get progressive hints
export const getProgressiveHint = (letter, hintLevel = 1) => {
  const hint = ASL_HINTS[letter.toUpperCase()];
  if (!hint) return null;

  switch (hintLevel) {
    case 1:
      return {
        emoji: hint.emoji,
        text: hint.mnemonic
      };
    case 2:
      return {
        emoji: hint.emoji,
        text: hint.description,
        shape: hint.handShape
      };
    case 3:
      return {
        emoji: hint.emoji,
        text: hint.description,
        shape: hint.handShape,
        thumb: hint.thumbPosition,
        visual: hint.visualCue
      };
    case 4:
      return {
        ...hint,
        showMistakes: true
      };
    default:
      return {
        emoji: hint.emoji,
        text: hint.mnemonic
      };
  }
};

export default ASL_HINTS;