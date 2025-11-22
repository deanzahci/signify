/**
 * Sign Language Recognition Configuration
 * Configure WebSocket URL and recognition parameters
 */

const config = {
  // WebSocket Configuration
  websocket: {
    // Change this to your backend URL when it's online
    // For local testing: 'ws://localhost:8000/ws'
    // For production: 'ws://your-backend-domain.com/ws'
    url: 'ws://localhost:8000/ws',

    // Reconnection settings
    maxReconnectAttempts: 5,
    reconnectDelay: 1000, // Initial delay in ms

    // Frame sending settings
    minFrameInterval: 100, // Minimum time between frames (ms)
    frameRate: 10, // Target FPS
  },

  // Recognition Settings
  recognition: {
    // Confidence threshold for accepting a sign (0-1)
    confidenceThreshold: 0.8, // 80% confidence required

    // Number of consecutive detections required
    requiredConsecutiveDetections: 3,

    // Timeout for single letter detection (ms)
    detectionTimeout: 5000,
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