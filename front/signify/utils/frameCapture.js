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

    const { frameRate = 100, quality = 0.5 } = options;
    this.frameRate = frameRate;
    this.quality = quality;

    console.log('📸 Starting frame capture:', {
      frameRate: `${frameRate}ms (${1000/frameRate} FPS)`,
      quality: quality,
      maxWidth: this.maxWidth
    });

    this.isCapturing = true;
    this.frameCount = 0;

    this.captureInterval = setInterval(async () => {
      if (!cameraRef || !cameraRef.current) {
        console.log('⚠️ Camera ref not available');
        return;
      }

      try {
        await this.captureFrame(cameraRef, onFrame);
      } catch (error) {
        console.error('❌ Frame capture error:', error);
      }
    }, frameRate);
  }

  /**
   * Capture a single frame
   */
  async captureFrame(cameraRef, onFrame) {
    if (!cameraRef.current) {
      console.log('⚠️ Camera not ready for capture');
      return;
    }

    const now = Date.now();

    try {
      // Using takePictureAsync for Expo Camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: this.quality,
        base64: true,
        exif: false,
        skipProcessing: true, // Skip processing for speed
        width: this.maxWidth // Limit width for performance
      });

      this.frameCount++;

      // Log frame capture details
      if (this.frameCount % 10 === 0) { // Log every 10th frame to reduce console spam
        console.log('📸 Frame captured:', {
          frameNumber: this.frameCount,
          size: photo.base64 ? `${(photo.base64.length / 1024).toFixed(2)} KB` : 'unknown',
          width: photo.width,
          height: photo.height,
          captureTime: `${now - this.lastCaptureTime}ms`,
          totalFrames: this.frameCount
        });
      }

      this.lastCaptureTime = now;

      // Convert base64 to blob if needed
      const jpegBlob = photo.base64;

      if (onFrame) {
        onFrame(jpegBlob, {
          width: photo.width,
          height: photo.height,
          frameNumber: this.frameCount,
          timestamp: now
        });
      }
    } catch (error) {
      // Only log errors occasionally to avoid spam when API is offline
      if (this.frameCount % 10 === 0) {
        console.log('⚠️ Could not capture frame:', error.message);
      }
    }
  }

  /**
   * Alternative method using CameraView's takePhoto if takePictureAsync is not available
   */
  async captureFrameAlternative(cameraRef, onFrame) {
    if (!cameraRef.current || !cameraRef.current.takePhoto) {
      console.log('⚠️ Camera takePhoto method not available');
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
      console.log('📸 Frame captured (alternative):', {
        frameNumber: this.frameCount,
        captureTime: `${now - this.lastCaptureTime}ms`
      });

      this.lastCaptureTime = now;

      if (onFrame && photo.base64) {
        onFrame(photo.base64, {
          frameNumber: this.frameCount,
          timestamp: now
        });
      }
    } catch (error) {
      console.log('⚠️ Alternative capture failed:', error.message);
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

    console.log('📸 Stopped frame capture:', {
      totalFramesCaptured: this.frameCount,
      duration: this.lastCaptureTime ? `${(Date.now() - this.lastCaptureTime) / 1000}s` : 'N/A'
    });

    this.frameCount = 0;
    this.lastCaptureTime = 0;
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