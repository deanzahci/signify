/**
 * WebSocket Service for Real-Time Sign Language Recognition
 * Handles streaming video frames to backend and receiving recognition results
 * 
 * ⚠️ CURRENTLY DISABLED FOR TESTING - All functionality commented out
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
  }

  /**
   * Initialize WebSocket connection - DISABLED
   */
  connect(url, callbacks = {}) {
    // COMMENTED OUT - WebSocket disabled for testing
    /*
    this.wsUrl = url || 'ws://localhost:8000/ws';
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log('📡 WebSocket Service: Checking backend availability...');

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.log('⚠️ Backend sign detection not available - using manual mode');
      this.isConnected = false;
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    }
    */
    
    // Just set callbacks and mark as disconnected
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.isConnected = false;
    console.log('ℹ️ WebSocket disabled - using manual detection only');
  }

  setupEventHandlers() {
    // COMMENTED OUT - WebSocket disabled
    /*
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected - Real-time sign detection enabled!');
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
        console.log('📥 Sign detected:', {
          letter: data.maxarg_letter,
          confidence: `${(data.target_arg_prob * 100).toFixed(1)}%`
        });

        if (this.callbacks.onMessage) {
          this.callbacks.onMessage(data);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      this.isConnected = false;
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;

      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }

      if (!event.wasClean && this.reconnectAttempts === 0) {
        this.reconnectAttempts = 1;
        setTimeout(() => {
          console.log('🔄 Retrying WebSocket connection once...');
          this.connect(this.wsUrl, this.callbacks);
        }, 2000);
      }
    };
    */
  }

  /**
   * Send frame and letter data to backend - DISABLED
   */
  async sendFrame(jpegBlob, newLetter = null) {
    // COMMENTED OUT - WebSocket disabled
    /*
    if (!this.isConnected || !this.ws) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastSentTime < this.minFrameInterval) {
      return false;
    }

    try {
      let jpegData = jpegBlob;
      if (jpegBlob instanceof Blob) {
        jpegData = await this.blobToBase64(jpegBlob);
      }

      const payload = {
        jpeg_blob: jpegData,
        new_letter: newLetter
      };

      this.ws.send(JSON.stringify(payload));
      this.lastSentTime = now;
      return true;
    } catch (error) {
      console.error('❌ Error sending frame:', error);
      return false;
    }
    */
    return false;
  }

  /**
   * Send a new target letter to reset backend state - DISABLED
   */
  sendNewLetter(letter) {
    // COMMENTED OUT - WebSocket disabled
    /*
    if (!this.isConnected || !this.ws) {
      return false;
    }

    const payload = {
      jpeg_blob: null,
      new_letter: letter
    };

    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('❌ Error sending new letter:', error);
      return false;
    }
    */
    return false;
  }

  /**
   * Convert Blob to base64 string - DISABLED
   */
  blobToBase64(blob) {
    // COMMENTED OUT - WebSocket disabled
    /*
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    */
    return Promise.resolve('');
  }

  /**
   * Attempt to reconnect with exponential backoff - DISABLED
   */
  attemptReconnect() {
    // COMMENTED OUT - WebSocket disabled
    /*
    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

    setTimeout(() => {
      this.connect(this.wsUrl, this.callbacks);
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
    */
  }

  /**
   * Handle connection errors - DISABLED
   */
  handleConnectionError(error) {
    // COMMENTED OUT - WebSocket disabled
    /*
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
    */
  }

  /**
   * Close WebSocket connection - DISABLED
   */
  disconnect() {
    // COMMENTED OUT - WebSocket disabled
    /*
    if (this.ws) {
      console.log('👋 Closing WebSocket connection...');
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
    */
  }

  /**
   * Check if WebSocket is connected - Always returns false when disabled
   */
  isConnected() {
    return false; // Always disconnected when WebSocket is disabled
  }
}

// Export singleton instance
export default new SignLanguageWebSocket();
