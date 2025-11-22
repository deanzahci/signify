/**
 * Frame Capture Utility
 * Captures frames from Expo Camera and converts to JPEG format
 */

class FrameCapture {
  constructor() {
    this.isCapturing = false;
    this.captureInterval = null;
    this.frameRate = 100; // Capture every 100ms (10 FPS)
    this.quality = 0.5; // JPEG quality (0-1)
    this.maxWidth = 640; // Max width for performance
    this.frameCount = 0;
    this.lastCaptureTime = 0;
    this.isProcessingFrame = false; // Track if we're currently processing a frame
    this.cameraReady = false; // Track camera readiness
  }

  /**
   * Start capturing frames from camera
   * @param {Object} cameraRef - Reference to CameraView component
   * @param {Function} onFrame - Callback for each captured frame
   * @param {Object} options - Capture options
   */
  startCapture(cameraRef, onFrame, options = {}) {
    if (this.isCapturing) {
      console.log('⚠️ Frame capture already in progress');
      return;
    }

    const { frameRate = 200, quality = 0.5 } = options; // Increased default to 200ms for safer capture
    this.frameRate = frameRate;
    this.quality = quality;
    this.cameraReady = true;

    console.log('📸 Starting frame capture:', {
      frameRate: `${frameRate}ms (${1000/frameRate} FPS)`,
      quality: quality,
      maxWidth: this.maxWidth
    });

    this.isCapturing = true;
    this.frameCount = 0;
    this.isProcessingFrame = false;

    this.captureInterval = setInterval(async () => {
      // Skip if camera not ready or already processing a frame
      if (!cameraRef || !cameraRef.current || this.isProcessingFrame || !this.cameraReady) {
        return;
      }

      try {
        await this.captureFrame(cameraRef, onFrame);
      } catch (error) {
        // Silently skip errors to avoid spam
        if (this.frameCount % 10 === 0) {
          console.log('⚠️ Frame capture skipped:', error.message);
        }
      }
    }, frameRate);
  }

  /**
   * Capture a single frame
   */
  async captureFrame(cameraRef, onFrame) {
    if (!cameraRef.current || this.isProcessingFrame) {
      return;
    }

    const now = Date.now();
    this.isProcessingFrame = true;

    try {
      // Check if takePictureAsync is available
      if (!cameraRef.current.takePictureAsync) {
        // Fall back to alternative method
        await this.captureFrameAlternative(cameraRef, onFrame);
        return;
      }

      // Using takePictureAsync for Expo Camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: this.quality,
        base64: false,  // Don't get base64, we want the raw URI
        exif: false,
        skipProcessing: true, // Skip processing for speed
        width: this.maxWidth // Limit width for performance
      });

      this.frameCount++;

      // Fetch the image as a blob from the URI
      const response = await fetch(photo.uri);
      const jpegBlob = await response.blob();

      // Log frame capture details
      if (this.frameCount % 10 === 0) { // Log every 10th frame to reduce console spam
        console.log('📸 Frame captured:', {
          frameNumber: this.frameCount,
          size: `${(jpegBlob.size / 1024).toFixed(2)} KB`,
          width: photo.width,
          height: photo.height,
          captureTime: `${now - this.lastCaptureTime}ms`,
          totalFrames: this.frameCount,
          blobType: jpegBlob.type
        });
      }

      this.lastCaptureTime = now;

      if (onFrame) {
        onFrame(jpegBlob, {
          width: photo.width,
          height: photo.height,
          frameNumber: this.frameCount,
          timestamp: now
        });
      }
    } catch (error) {
      // Handle camera unmounted error specifically
      if (error.message && error.message.includes('unmounted')) {
        this.cameraReady = false;
        // Wait a bit before allowing captures again
        setTimeout(() => {
          this.cameraReady = true;
        }, 500);
      }

      // Only log errors occasionally to avoid spam
      if (this.frameCount % 10 === 0) {
        console.log('⚠️ Could not capture frame:', error.message);
      }
    } finally {
      this.isProcessingFrame = false;
    }
  }

  /**
   * Alternative method using CameraView's takePhoto if takePictureAsync is not available
   */
  async captureFrameAlternative(cameraRef, onFrame) {
    if (!cameraRef.current || !cameraRef.current.takePhoto) {
      return;
    }

    const now = Date.now();

    try {
      // Alternative method for newer Expo Camera versions
      const photo = await cameraRef.current.takePhoto({
        quality: this.quality,
        base64: true
      });

      this.frameCount++;

      // Log frame capture details
      if (this.frameCount % 10 === 0) {
        console.log('📸 Frame captured (alternative):', {
          frameNumber: this.frameCount,
          captureTime: `${now - this.lastCaptureTime}ms`
        });
      }

      this.lastCaptureTime = now;

      if (onFrame && photo.base64) {
        onFrame(photo.base64, {
          frameNumber: this.frameCount,
          timestamp: now
        });
      }
    } catch (error) {
      // Handle camera unmounted error specifically
      if (error.message && error.message.includes('unmounted')) {
        this.cameraReady = false;
        setTimeout(() => {
          this.cameraReady = true;
        }, 500);
      }

      if (this.frameCount % 10 === 0) {
        console.log('⚠️ Alternative capture failed:', error.message);
      }
    } finally {
      this.isProcessingFrame = false;
    }
  }

  /**
   * Stop capturing frames
   */
  stopCapture() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    this.isCapturing = false;
    this.isProcessingFrame = false;
    this.cameraReady = false;

    console.log('📸 Stopped frame capture:', {
      totalFramesCaptured: this.frameCount,
      duration: this.lastCaptureTime ? `${(Date.now() - this.lastCaptureTime) / 1000}s` : 'N/A'
    });

    this.frameCount = 0;
    this.lastCaptureTime = 0;
  }

  /**
   * Set camera ready state
   */
  setCameraReady(ready) {
    this.cameraReady = ready;
    if (ready) {
      this.isProcessingFrame = false;
    }
  }

  /**
   * Check if currently capturing
   */
  isCapturing() {
    return this.isCapturing;
  }

  /**
   * Get capture statistics
   */
  getStats() {
    return {
      isCapturing: this.isCapturing,
      frameCount: this.frameCount,
      frameRate: this.frameRate,
      quality: this.quality
    };
  }
}

// Export singleton instance
export default new FrameCapture();