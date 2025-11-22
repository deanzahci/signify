// Consistent animation configuration for neo-brutalist theme
// All animations should follow these standardized timings for consistency

export const ANIMATION_CONFIG = {
  // Standard durations - slightly slower for smoother feel
  durations: {
    instant: 150,   // Very quick transitions
    fast: 250,      // Quick transitions
    normal: 350,    // Standard transitions
    medium: 450,    // Medium emphasis
    slow: 550,      // Slower, more deliberate
    emphasis: 700,  // Strong emphasis animations
    smooth: 800,    // Very smooth, deliberate animations
  },

  // Standard delays for staggered animations
  delays: {
    none: 0,
    quick: 50,
    normal: 150,
    medium: 250,
    long: 350,
    stagger: 60,   // Per-item stagger delay - slightly longer for smoother effect
  },

  // Spring animations for smoother, more polished bounce
  spring: {
    damping: 18,    // Increased for less bouncy, more controlled motion
    stiffness: 120, // Decreased for softer spring effect
    mass: 1.2,      // Slightly heavier for more natural motion
  },

  // Common animation patterns
  patterns: {
    // Enter animations - smoother with easing
    fadeIn: {
      duration: 350,
      delay: 100,
      easing: 'ease-out',
    },
    zoomIn: {
      duration: 450,
      delay: 150,
      springify: true,
      initialScale: 0.85,  // Start from slightly visible for smoother entrance
    },
    slideIn: {
      duration: 450,
      delay: 100,
      easing: 'ease-out',
    },

    // Exit animations - faster for cleaner feel
    fadeOut: {
      duration: 350,
      delay: 0,
      easing: 'ease-in',
    },
    zoomOut: {
      duration: 250,
      delay: 0,
      finalScale: 0.9,  // Don't shrink all the way for smoother exit
    },

    // Button press - subtle but responsive
    buttonPress: {
      scaleDown: 0.97,  // Less dramatic scale for cleaner feel
      duration: 80,
      easing: 'ease-out',
    },

    // Success/feedback - controlled celebration
    success: {
      scale: 1.08,  // Slightly less dramatic
      duration: 400,
      springify: true,
      damping: 20,  // More controlled bounce
    },

    // Pulse/heartbeat - smooth breathing effect
    pulse: {
      scale: 1.04,  // More subtle
      duration: 600,
      repeat: true,
      easing: 'ease-in-out',
    },

    // Timer warning pulse - urgent but not jarring
    timerWarning: {
      scale: 1.06,
      duration: 450,
      repeat: true,
      easing: 'ease-in-out',
    },

    // Modal/popup animations - smooth and elegant
    modalEnter: {
      duration: 400,
      initialScale: 0.92,
      springify: true,
      damping: 22,
      stiffness: 100,
    },
    modalExit: {
      duration: 300,
      finalScale: 0.95,
      easing: 'ease-in',
    },
  },
};

// Helper function to get consistent animation config
export const getAnimationTiming = (type, property = 'duration') => {
  if (ANIMATION_CONFIG.patterns[type]) {
    return ANIMATION_CONFIG.patterns[type][property] || ANIMATION_CONFIG.durations.normal;
  }
  return ANIMATION_CONFIG.durations.normal;
};

// Helper function for staggered animations
export const getStaggerDelay = (index, baseDelay = ANIMATION_CONFIG.delays.normal) => {
  return baseDelay + (index * ANIMATION_CONFIG.delays.stagger);
};

// Export individual configs for convenience
export const SPRING_CONFIG = ANIMATION_CONFIG.spring;
export const DURATIONS = ANIMATION_CONFIG.durations;
export const DELAYS = ANIMATION_CONFIG.delays;