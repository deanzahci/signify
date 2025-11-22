/**
 * WebSocket Service for Real-Time Sign Language Recognition
 * Handles streaming video frames to backend and receiving recognition results
 */

class SignLanguageWebSocket {
  constructor() {
    this.ws = null;
    this.wsUrl = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.callbacks = {
      onMessage: null,
      onConnect: null,
      onDisconnect: null,
      onError: null
    };
    this.frameQueue = [];
    this.sendingFrame = false;
    this.lastSentTime = 0;
    this.minFrameInterval = 100; // Minimum 100ms between frames (10 FPS max)
  }

  /**
   * Initialize WebSocket connection
   * @param {string} url - WebSocket server URL
   * @param {object} callbacks - Event callbacks
   */
  connect(url, callbacks = {}) {
    this.wsUrl = url || 'ws://localhost:8000/ws'; // Default to localhost for testing
    this.callbacks = { ...this.callbacks, ...callbacks };

    console.log('🔌 Attempting WebSocket connection to:', this.wsUrl);
    console.log('📡 WebSocket Service: Initializing connection...');

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      console.log('⚠️ API NOT ONLINE - Cannot establish WebSocket connection');
      this.handleConnectionError(error);
    }
  }

  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected successfully!');
      console.log('📡 Connection established with sign language recognition backend');
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
        console.log('📥 Received from backend:', {
          maxarg_letter: data.maxarg_letter,
          target_arg_prob: data.target_arg_prob,
          timestamp: new Date().toISOString()
        });

        if (this.callbacks.onMessage) {
          this.callbacks.onMessage(data);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        console.log('Raw message:', event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      console.log('⚠️ API NOT ONLINE - WebSocket error occurred');
      this.handleConnectionError(error);
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });

      this.isConnected = false;

      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }

      // Attempt reconnection if not a clean close
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('⚠️ API NOT ONLINE - Max reconnection attempts reached');
      }
    };
  }

  /**
   * Send frame and letter data to backend
   * @param {Blob|ArrayBuffer} jpegBlob - JPEG image data
   * @param {string|null} newLetter - New target letter (null if unchanged)
   */
  async sendFrame(jpegBlob, newLetter = null) {
    if (!this.isConnected || !this.ws) {
      console.log('⚠️ API NOT ONLINE - Cannot send frame, WebSocket not connected');
      return false;
    }

    // Throttle frame sending
    const now = Date.now();
    if (now - this.lastSentTime < this.minFrameInterval) {
      console.log('⏳ Throttling frame - too soon since last send');
      return false;
    }

    try {
      // Convert blob to base64 if needed (depending on backend requirements)
      let jpegData = jpegBlob;
      if (jpegBlob instanceof Blob) {
        jpegData = await this.blobToBase64(jpegBlob);
      }

      const payload = {
        jpeg_blob: jpegData,
        new_letter: newLetter
      };

      // Log what we're sending
      console.log('📤 Sending to backend:', {
        new_letter: newLetter,
        jpeg_size: jpegData ? jpegData.length : 0,
        timestamp: new Date().toISOString(),
        format: 'base64 encoded JPEG'
      });

      if (newLetter) {
        console.log('🔤 Target letter changed to:', newLetter);
      }

      this.ws.send(JSON.stringify(payload));
      this.lastSentTime = now;
      return true;
    } catch (error) {
      console.error('❌ Error sending frame:', error);
      return false;
    }
  }

  /**
   * Send a new target letter to reset backend state
   * @param {string} letter - The new target letter
   */
  sendNewLetter(letter) {
    if (!this.isConnected || !this.ws) {
      console.log('⚠️ API NOT ONLINE - Cannot send new letter, WebSocket not connected');
      return false;
    }

    console.log('🔤 Sending new target letter to backend:', letter);

    const payload = {
      jpeg_blob: null,
      new_letter: letter
    };

    console.log('📤 Emergency reset payload:', payload);

    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('❌ Error sending new letter:', error);
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
        // Remove the data:image/jpeg;base64, prefix
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
    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    console.log(`⏱️ Waiting ${this.reconnectDelay}ms before reconnect...`);

    setTimeout(() => {
      this.connect(this.wsUrl, this.callbacks);
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000); // Max 10 seconds
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    console.log('⚠️ API NOT ONLINE - Connection error handled');
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
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export default new SignLanguageWebSocket();