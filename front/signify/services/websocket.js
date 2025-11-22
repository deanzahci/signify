/**
 * WebSocket Service for Real-Time Sign Language Recognition
 * Handles streaming video frames to backend and receiving recognition results
 * Includes fallback support for when backend is unavailable
 */

class SignLanguageWebSocket {
  constructor() {
    this.ws = null;
    this.wsUrl = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.callbacks = {
      onMessage: null,
      onConnect: null,
      onDisconnect: null,
      onError: null
    };
    this.frameQueue = [];
    this.sendingFrame = false;
    this.lastSentTime = 0;
    this.minFrameInterval = 100;
    this.connectionAttempted = false;
  }

  /**
   * Initialize WebSocket connection with fallback support
   */
  connect(url, callbacks = {}) {
    this.wsUrl = url || 'wss://signify-production-8eb6.up.railway.app';
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log(' WebSocket Service: Attempting connection to:', this.wsUrl);

    // Mark that we've attempted connection
    this.connectionAttempted = true;

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupEventHandlers();

      // Set a timeout for initial connection
      setTimeout(() => {
        if (!this.isConnected) {
          console.log(' WebSocket connection timeout - falling back to manual mode');
          this.handleFallback();
        }
      }, 3000);
    } catch (error) {
      console.log(' Backend sign detection not available - using manual mode');
      this.handleFallback();
    }
  }

  /**
   * Handle fallback when WebSocket is not available
   */
  handleFallback() {
    this.isConnected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log(' Running in offline mode - manual detection available');

    if (this.callbacks.onDisconnect) {
      this.callbacks.onDisconnect();
    }
  }

  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log(' WebSocket connected - Real-time sign detection enabled!');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Backend API documentation states it should return:
        // - maxarg_letter: The detected letter (A-Z)
        // - target_arg_prob: Confidence score (0.0-1.0)

        // Check if backend is using documented field names
        if (data.maxarg_letter !== undefined) {
          // Backend is using correct documented field names
          if (this.callbacks.onMessage) {
            this.callbacks.onMessage(data);
          }
        } else if (data.detected_word_letter !== undefined) {
          // Backend is using different field names, map them
          const mappedData = {
            maxarg_letter: data.detected_word_letter,
            maxarg_word: data.detected_word_letter, // For compatibility
            target_arg_prob: data.target_lettr_prob || data.target_word_prob || 0
          };

          if (this.callbacks.onMessage) {
            this.callbacks.onMessage(mappedData);
          }
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.log(' WebSocket error occurred - falling back to manual mode');
      this.isConnected = false;

      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }

      // Don't try to reconnect if this is the first connection attempt
      if (this.reconnectAttempts === 0) {
        this.handleFallback();
      }
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;

      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }

      // Only attempt reconnect if we were previously connected
      if (!event.wasClean && this.reconnectAttempts === 0 && this.connectionAttempted) {
        this.reconnectAttempts = 1;
        setTimeout(() => {
          console.log('🔄 Retrying WebSocket connection once...');
          this.connect(this.wsUrl, this.callbacks);
        }, 2000);
      } else {
        console.log(' WebSocket disconnected - manual mode available');
        this.handleFallback();
      }
    };
  }

  /**
   * Send frame and letter data to backend
   */
  async sendFrame(jpegBlob, newLetter = null) {
    if (!this.isConnected || !this.ws) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastSentTime < this.minFrameInterval) {
      return false;
    }

    try {
      // Convert blob to base64 string for JSON transmission
      let base64Data;

      if (jpegBlob instanceof Blob) {
        // Convert blob to base64 string using the existing helper method
        base64Data = await this.blobToBase64(jpegBlob);
        // Removed verbose sending log - focus on responses
      } else {
        // If it's already string/base64, use as is
        base64Data = jpegBlob;
      }

      // Create payload with base64 encoded image
      const payload = {
        jpeg_blob: base64Data, // Now sending as base64 string
        new_word_letter: newLetter  // Backend expects 'new_word_letter'
      };

      this.ws.send(JSON.stringify(payload));

      this.lastSentTime = now;
      return true;
    } catch (error) {
      console.error('❌ Error sending frame:', error);
      this.handleFallback();
      return false;
    }
  }

  /**
   * Send a new target letter to inform backend of current target
   * Backend uses this to calculate target_arg_prob (confidence for correct letter)
   */
  sendNewLetter(letter) {
    if (!this.isConnected || !this.ws) {
      return false;
    }

    const payload = {
      jpeg_blob: null,
      new_word_letter: letter  // Backend expects 'new_word_letter'
    };

    try {
      this.ws.send(JSON.stringify(payload));
      console.log('📤 Sent new letter to backend:', letter);
      return true;
    } catch (error) {
      console.error('❌ Error sending new letter:', error);
      this.handleFallback();
      return false;
    }
  }

  /**
   * Send a new target word to reset backend state
   */
  sendNewWord(word) {
    if (!this.isConnected || !this.ws) {
      return false;
    }

    const payload = {
      jpeg_blob: null,
      new_word: word
    };

    try {
      this.ws.send(JSON.stringify(payload));
      console.log('📤 Sent new word to backend:', word);
      return true;
    } catch (error) {
      console.error('❌ Error sending new word:', error);
      this.handleFallback();
      return false;
    }
  }

  /**
   * Convert Blob to base64 string
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(' Max reconnection attempts reached - staying in manual mode');
      this.handleFallback();
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

    setTimeout(() => {
      this.connect(this.wsUrl, this.callbacks);
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    console.error('WebSocket connection error:', error);
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    if (this.ws) {
      console.log('👋 Closing WebSocket connection...');
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.isConnected;
  }
}

// Export singleton instance
export default new SignLanguageWebSocket();