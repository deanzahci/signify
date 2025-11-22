// Consistent animation configuration for neo-brutalist theme
// All animations should follow these standardized timings for consistency

export const ANIMATION_CONFIG = {
  // Standard durations
  durations: {
    fast: 200,      // Quick transitions
    normal: 300,    // Standard transitions
    medium: 400,    // Medium emphasis
    slow: 500,      // Slower, more deliberate
    emphasis: 600,  // Strong emphasis animations
  },

  // Standard delays for staggered animations
  delays: {
    none: 0,
    quick: 100,
    normal: 200,
    medium: 300,
    long: 400,
    stagger: 50,   // Per-item stagger delay
  },

  // Spring animations for neo-brutalist bounce
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },

  // Common animation patterns
  patterns: {
    // Enter animations
    fadeIn: {
      duration: 300,
      delay: 200,
    },
    zoomIn: {
      duration: 400,
      delay: 300,
      springify: true,
    },
    slideIn: {
      duration: 400,
      delay: 200,
    },

    // Exit animations
    fadeOut: {
      duration: 500,
      delay: 0,
    },
    zoomOut: {
      duration: 300,
      delay: 0,
    },

    // Button press
    buttonPress: {
      scaleDown: 0.95,
      duration: 100,
    },

    // Success/feedback
    success: {
      scale: 1.1,
      duration: 300,
      springify: true,
    },

    // Pulse/heartbeat
    pulse: {
      scale: 1.05,
      duration: 500,
      repeat: true,
    },

    // Timer warning pulse
    timerWarning: {
      scale: 1.08,
      duration: 400,
      repeat: true,
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