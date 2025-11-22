/**
 * Sign Language Recognition Configuration
 * Configure WebSocket URL and recognition parameters
 */

const config = {
  // WebSocket Configuration
  websocket: {
    // Change this to your backend URL when it's online
    // For local testing: 'ws://localhost:8765'
    // For production (Railway): 'wss://signify-production-8eb6.up.railway.app'
    url: 'wss://signify-production-8eb6.up.railway.app',

    // Reconnection settings
    maxReconnectAttempts: 5,
    reconnectDelay: 1000, // Initial delay in ms

    // Frame sending settings
    minFrameInterval: 50, // Reduced from 100ms - allows up to 20 FPS
    frameRate: 15, // Increased from 10 FPS to 15 FPS
  },

  // Recognition Settings
  recognition: {
    // Detection mode: 'letter' or 'word'
    // 'letter' - detect individual letters
    // 'word' - detect complete words
    defaultMode: 'word', // Change to 'letter' for letter-by-letter detection

    // Confidence threshold for accepting a sign (0-1)
    confidenceThreshold: 0.8, // 80% confidence required

    // Number of consecutive detections required
    requiredConsecutiveDetections: 3,

    // Timeout for single letter detection (ms)
    detectionTimeout: 5000,

    // Word detection specific settings
    wordMode: {
      // Enable word detection features
      enabled: true,

      // Minimum confidence for word acceptance
      wordConfidenceThreshold: 0.75,

      // Number of consecutive word detections required
      requiredConsecutiveWordDetections: 2,
    },
  },

  // Camera Settings
  camera: {
    quality: 0.5, // JPEG quality (0-1)
    maxWidth: 640, // Maximum width for captured frames
    facing: 'front', // 'front' or 'back'
  },

  // Debug Settings
  debug: {
    enabled: true, // Enable detailed console logging
    logFrameCapture: true, // Log frame capture events
    logWebSocket: true, // Log WebSocket events
    logRecognition: true, // Log recognition results
  }
};

export default config;