/**
 * Sign Detection Manager
 * Coordinates between WebSocket, frame capture, and game logic
 */

import WebSocketService from './websocket';
import FrameCapture from '../utils/frameCapture';

class SignDetectionManager {
  constructor() {
    this.isActive = false;
    this.currentTargetLetter = null;
    this.currentTargetWord = null;
    this.detectionMode = 'letter'; // 'letter' or 'word'
    this.cameraRef = null;
    this.callbacks = {
      onLetterDetected: null,
      onWordDetected: null,
      onConfidenceUpdate: null,
      onConnectionChange: null
    };
    this.confidenceThreshold = 0.8; // 80% confidence to accept
    this.lastDetectedLetter = null;
    this.lastDetectedWord = null;
    this.consecutiveDetections = 0;
    this.requiredConsecutiveDetections = 3; // Need 3 consecutive detections
    this.wsConnected = false;
    this.debugMode = true; // Enable detailed logging
  }

  /**
   * Initialize sign detection system
   * @param {string} wsUrl - WebSocket server URL
   * @param {Object} callbacks - Event callbacks
   */
  initialize(wsUrl, callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };

    console.log('🚀 Sign Detection: Attempting to connect to backend');

    // Setup WebSocket connection
    WebSocketService.connect(wsUrl, {
      onMessage: (data) => this.handleRecognitionResult(data),
      onConnect: () => this.handleConnectionEstablished(),
      onDisconnect: () => this.handleConnectionLost(),
      onError: (error) => this.handleConnectionError(error)
    });
  }

  /**
   * Start detecting signs for a specific letter
   * @param {Object} cameraRef - Reference to camera component
   * @param {string} targetLetter - The letter to detect
   */
  startDetection(cameraRef, targetLetter) {
    if (!cameraRef || !cameraRef.current) {
      console.error('❌ Camera ref not provided or invalid');
      return false;
    }

    this.cameraRef = cameraRef;
    this.currentTargetLetter = targetLetter;
    this.currentTargetWord = null;
    this.detectionMode = 'letter';
    this.lastDetectedLetter = null;
    this.consecutiveDetections = 0;
    this.isActive = true;

    console.log('🎯 Starting sign detection for letter:', targetLetter);
    console.log('📊 Detection settings:', {
      confidenceThreshold: this.confidenceThreshold,
      requiredConsecutiveDetections: this.requiredConsecutiveDetections
    });

    // Send new letter to backend to reset state
    if (this.wsConnected) {
      WebSocketService.sendNewLetter(targetLetter);
    }

    // Start capturing frames
    FrameCapture.startCapture(
      cameraRef,
      (frameData, metadata) => this.handleFrameCapture(frameData, metadata),
      {
        frameRate: 200, // 200ms = 5 FPS for more stable capture
        quality: 0.5
      }
    );

    return true;
  }

  /**
   * Start detecting signs for a specific word
   * @param {Object} cameraRef - Reference to camera component
   * @param {string} targetWord - The word to detect
   */
  startWordDetection(cameraRef, targetWord) {
    if (!cameraRef || !cameraRef.current) {
      console.error('❌ Camera ref not provided or invalid');
      return false;
    }

    this.cameraRef = cameraRef;
    this.currentTargetWord = targetWord;
    this.currentTargetLetter = null;
    this.detectionMode = 'word';
    this.lastDetectedWord = null;
    this.consecutiveDetections = 0;
    this.isActive = true;

    console.log('🎯 Starting sign detection for word:', targetWord);
    console.log('📊 Detection settings:', {
      confidenceThreshold: this.confidenceThreshold,
      requiredConsecutiveDetections: this.requiredConsecutiveDetections
    });

    // Send new word to backend to reset state
    if (this.wsConnected) {
      WebSocketService.sendNewWord(targetWord);
    }

    // Start capturing frames
    FrameCapture.startCapture(
      cameraRef,
      (frameData, metadata) => this.handleFrameCapture(frameData, metadata),
      {
        frameRate: 200, // 200ms = 5 FPS for more stable capture
        quality: 0.5
      }
    );

    return true;
  }

  /**
   * Update target letter without stopping detection
   * @param {string} newLetter - New target letter
   */
  updateTargetLetter(newLetter) {
    if (this.currentTargetLetter === newLetter) {
      return;
    }

    console.log('🔄 Updating target letter from', this.currentTargetLetter, 'to', newLetter);
    this.currentTargetLetter = newLetter;
    this.currentTargetWord = null;
    this.detectionMode = 'letter';
    this.lastDetectedLetter = null;
    this.consecutiveDetections = 0;

    // Send new letter to backend
    if (this.wsConnected) {
      WebSocketService.sendNewLetter(newLetter);
    }
  }

  /**
   * Update target word without stopping detection
   * @param {string} newWord - New target word
   */
  updateTargetWord(newWord) {
    if (this.currentTargetWord === newWord) {
      return;
    }

    console.log('🔄 Updating target word from', this.currentTargetWord, 'to', newWord);
    this.currentTargetWord = newWord;
    this.currentTargetLetter = null;
    this.detectionMode = 'word';
    this.lastDetectedWord = null;
    this.consecutiveDetections = 0;

    // Send new word to backend
    if (this.wsConnected) {
      WebSocketService.sendNewWord(newWord);
    }
  }

  /**
   * Handle captured frame
   */
  handleFrameCapture(frameData, metadata) {
    if (!this.isActive || !this.wsConnected) {
      // Silently skip if not connected - no need to spam logs
      return;
    }

    // Send frame to backend
    WebSocketService.sendFrame(frameData, null);
  }

  /**
   * Handle recognition result from backend
   */
  handleRecognitionResult(data) {
    const { maxarg_letter, maxarg_word, target_arg_prob } = data;

    if (!this.isActive) {
      return;
    }

    // Handle based on detection mode
    if (this.detectionMode === 'word') {
      this.handleWordRecognition(maxarg_word || maxarg_letter, target_arg_prob);
    } else {
      this.handleLetterRecognition(maxarg_letter || maxarg_word, target_arg_prob);
    }
  }

  /**
   * Handle letter recognition
   */
  handleLetterRecognition(detectedValue, confidence) {
    if (!this.currentTargetLetter) return;

    // Log recognition result
    if (this.debugMode) {
      console.log('🤖 Letter recognition result:', {
        targetLetter: this.currentTargetLetter,
        detectedLetter: detectedValue,
        confidence: `${(confidence * 100).toFixed(1)}%`,
        threshold: `${(this.confidenceThreshold * 100).toFixed(1)}%`
      });
    }

    // Update confidence callback
    if (this.callbacks.onConfidenceUpdate) {
      this.callbacks.onConfidenceUpdate(confidence, detectedValue);
    }

    // Check if detected letter matches target with sufficient confidence
    if (detectedValue === this.currentTargetLetter && confidence >= this.confidenceThreshold) {
      if (detectedValue === this.lastDetectedLetter) {
        this.consecutiveDetections++;
        console.log(`✓ Consecutive detection ${this.consecutiveDetections}/${this.requiredConsecutiveDetections}`);
      } else {
        this.consecutiveDetections = 1;
        this.lastDetectedLetter = detectedValue;
      }

      // Check if we have enough consecutive detections
      if (this.consecutiveDetections >= this.requiredConsecutiveDetections) {
        console.log('✅ Letter detected successfully:', this.currentTargetLetter);

        if (this.callbacks.onLetterDetected) {
          this.callbacks.onLetterDetected(this.currentTargetLetter);
        }

        // Reset for next letter
        this.consecutiveDetections = 0;
        this.lastDetectedLetter = null;
      }
    } else {
      // Reset consecutive count if different letter or low confidence
      if (this.lastDetectedLetter !== detectedValue) {
        this.consecutiveDetections = 0;
        this.lastDetectedLetter = null;
      }
    }
  }

  /**
   * Handle word recognition
   */
  handleWordRecognition(detectedValue, confidence) {
    if (!this.currentTargetWord) return;

    // Log recognition result
    if (this.debugMode) {
      console.log('🤖 Word recognition result:', {
        targetWord: this.currentTargetWord,
        detectedWord: detectedValue,
        confidence: `${(confidence * 100).toFixed(1)}%`,
        threshold: `${(this.confidenceThreshold * 100).toFixed(1)}%`
      });
    }

    // Update confidence callback
    if (this.callbacks.onConfidenceUpdate) {
      this.callbacks.onConfidenceUpdate(confidence, detectedValue);
    }

    // Check if detected word matches target with sufficient confidence
    if (detectedValue === this.currentTargetWord && confidence >= this.confidenceThreshold) {
      if (detectedValue === this.lastDetectedWord) {
        this.consecutiveDetections++;
        console.log(`✓ Consecutive word detection ${this.consecutiveDetections}/${this.requiredConsecutiveDetections}`);
      } else {
        this.consecutiveDetections = 1;
        this.lastDetectedWord = detectedValue;
      }

      // Check if we have enough consecutive detections
      if (this.consecutiveDetections >= this.requiredConsecutiveDetections) {
        console.log('✅ Word detected successfully:', this.currentTargetWord);

        if (this.callbacks.onWordDetected) {
          this.callbacks.onWordDetected(this.currentTargetWord);
        }

        // Reset for next word
        this.consecutiveDetections = 0;
        this.lastDetectedWord = null;
      }
    } else {
      // Reset consecutive count if different word or low confidence
      if (this.lastDetectedWord !== detectedValue) {
        this.consecutiveDetections = 0;
        this.lastDetectedWord = null;
      }
    }
  }

  /**
   * Handle WebSocket connection established
   */
  handleConnectionEstablished() {
    console.log('✅ Sign detection connected to backend');
    this.wsConnected = true;

    if (this.callbacks.onConnectionChange) {
      this.callbacks.onConnectionChange(true);
    }

    // Send current target based on detection mode
    if (this.isActive) {
      if (this.detectionMode === 'word' && this.currentTargetWord) {
        WebSocketService.sendNewWord(this.currentTargetWord);
      } else if (this.detectionMode === 'letter' && this.currentTargetLetter) {
        WebSocketService.sendNewLetter(this.currentTargetLetter);
      }
    }
  }

  /**
   * Handle WebSocket connection lost
   */
  handleConnectionLost() {
    if (this.wsConnected) {
      console.log('⚠️ Backend disconnected - Using manual sign detection');
    }
    this.wsConnected = false;

    if (this.callbacks.onConnectionChange) {
      this.callbacks.onConnectionChange(false);
    }
  }

  /**
   * Handle WebSocket connection error
   */
  handleConnectionError(error) {
    // Silently handle error - backend not available
    if (!this.wsConnected) {
      console.log('ℹ️ Using manual detection mode (backend not available)');
    }
  }

  /**
   * Stop sign detection
   */
  stopDetection() {
    console.log('🛑 Stopping sign detection');

    this.isActive = false;
    this.currentTargetLetter = null;
    this.currentTargetWord = null;
    this.lastDetectedLetter = null;
    this.lastDetectedWord = null;
    this.consecutiveDetections = 0;

    // Stop frame capture
    FrameCapture.stopCapture();
  }

  /**
   * Clean up and disconnect
   */
  disconnect() {
    this.stopDetection();
    WebSocketService.disconnect();
    this.wsConnected = false;
  }

  /**
   * Check if system is ready
   */
  isReady() {
    return this.wsConnected;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      isConnected: this.wsConnected,
      detectionMode: this.detectionMode,
      currentTargetLetter: this.currentTargetLetter,
      currentTargetWord: this.currentTargetWord,
      captureStats: FrameCapture.getStats()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.confidenceThreshold !== undefined) {
      this.confidenceThreshold = config.confidenceThreshold;
      console.log('📊 Updated confidence threshold:', this.confidenceThreshold);
    }
    if (config.requiredConsecutiveDetections !== undefined) {
      this.requiredConsecutiveDetections = config.requiredConsecutiveDetections;
      console.log('📊 Updated required consecutive detections:', this.requiredConsecutiveDetections);
    }
    if (config.debugMode !== undefined) {
      this.debugMode = config.debugMode;
      console.log('🔧 Debug mode:', this.debugMode);
    }
  }
}

// Export singleton instance
export default new SignDetectionManager();