# ONNX Model Quick Start Guide

## 🚀 Quick Deployment (5 minutes)

### Prerequisites
- Python 3.8+
- ONNX model file: `lstm_best_acc0.9946.onnx`

### Step 1: Place Model File
```bash
# Copy your ONNX model to the models directory
cp /path/to/lstm_best_acc0.9946.onnx back/models/

# Verify it's there
ls -lh back/models/lstm_best_acc0.9946.onnx
```

### Step 2: Install Dependencies
```bash
cd back/
pip install -r requirements.txt
```

Expected output:
```
Installing collected packages: onnxruntime
Successfully installed onnxruntime-1.16.x
```

### Step 3: Start Server
```bash
python main.py
```

Expected logs:
```
INFO - Loaded ONNX model from .../models/lstm_best_acc0.9946.onnx
INFO - Input: input [1, 1, 21, 3]
INFO - Output: output [1, 26]
INFO - Starting WebSocket server on 0.0.0.0:8765
```

### Step 4: Test Connection
Open another terminal:
```bash
# Test WebSocket is running
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  http://localhost:8765
```

---

## 📊 What Changed?

### Before (PyTorch)
- Required **2 hands** visible
- Waited for **32 frames** before prediction
- Response time: **~1-2 seconds**

### After (ONNX)
- Requires **1 hand** visible ✨
- Predicts **per frame** immediately
- Response time: **~100ms** ⚡

---

## 🧪 Testing the Integration

### Test 1: Check Model Loading
```python
from services.onnx_predictor import ONNXPredictor
import numpy as np

# Initialize predictor
predictor = ONNXPredictor()

# Check model info
info = predictor.get_model_info()
print(f"Model: {info['model_path']}")
print(f"Mock mode: {info['mock_mode']}")  # Should be False
```

### Test 2: Test Normalization
```python
# Create test landmarks
landmarks = np.random.rand(21, 3).astype(np.float32)

# Normalize
normalized = predictor.normalize_landmarks(landmarks)

# Verify wrist is at origin
assert np.allclose(normalized[0], [0, 0, 0])
print("✓ Normalization working")
```

### Test 3: Test Prediction
```python
# Run inference
letter, confidence = predictor.predict(landmarks)

print(f"Predicted: {letter} ({confidence:.2%})")
assert letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
assert 0 <= confidence <= 1
print("✓ Prediction working")
```

### Test 4: End-to-End WebSocket Test
```bash
# In terminal 1: Start server
python main.py

# In terminal 2: Send test frame (requires client app)
# Connect to ws://localhost:8765 and send JPEG frame
# You should receive predictions within 100ms
```

---

## 🔧 Troubleshooting

### Problem: "ONNX model not found"
```bash
# Check if file exists
ls -la back/models/lstm_best_acc0.9946.onnx

# If missing, copy it:
cp /path/to/lstm_best_acc0.9946.onnx back/models/
```

### Problem: "Running in mock mode"
**Cause**: Model file not found  
**Fix**: Place model file in correct location (see above)

### Problem: "No hands detected"
**Cause**: MediaPipe not detecting hand in frame  
**Fixes**:
- Ensure hand is clearly visible
- Improve lighting
- Lower detection threshold in `config.py`:
  ```python
  MEDIAPIPE_MIN_DETECTION_CONFIDENCE = 0.3  # Lower = more sensitive
  ```

### Problem: "Predictions are wrong/noisy"
**Fixes**:
1. Check hand positioning (palm facing camera)
2. Ensure good lighting
3. Increase smoothing window:
   ```python
   # config.py
   SLIDING_WINDOW_SIZE = 7  # Increase from 5
   ```

### Problem: "High CPU usage"
**Fixes**:
1. Reduce frame rate on client side
2. Increase throttling:
   ```python
   # config.py
   THROTTLE_MIN_INTERVAL_MS = 150  # Increase from 75
   ```
3. Use GPU acceleration (if available):
   ```python
   # In onnx_predictor.py __init__
   providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
   ```

---

## 🎯 Tuning Performance

### For Lower Latency (faster response)
```python
# config.py
SLIDING_WINDOW_SIZE = 3  # Reduce smoothing
THROTTLE_MIN_INTERVAL_MS = 50  # Accept more frames
```

### For Higher Accuracy (more stable)
```python
# config.py
SLIDING_WINDOW_SIZE = 7  # More smoothing
THROTTLE_MIN_INTERVAL_MS = 100  # Less frequent updates
MEDIAPIPE_MIN_DETECTION_CONFIDENCE = 0.7  # Stricter detection
```

### For Lower CPU Usage
```python
# config.py
THROTTLE_MIN_INTERVAL_MS = 200  # Process fewer frames
MEDIAPIPE_MODEL_COMPLEXITY = 0  # Simpler model (0 or 1)
```

---

## 📈 Monitoring

### Check Metrics
```python
# Access metrics during runtime
from utils.metrics import PerformanceMetrics

metrics = consumer.metrics
print(f"Inferences: {metrics.inference_count}")
print(f"Errors: {metrics.error_count}")
print(f"Avg latency: {metrics.get_avg_frame_time():.3f}s")
```

### View Logs
```bash
# Server logs show prediction results
tail -f logs/server.log | grep "Inference result"
```

Example output:
```
INFO - Inference result: A (target: A, prob: 0.952)
INFO - Inference result: B (target: B, prob: 0.887)
```

---

## 🔄 Rollback to PyTorch (if needed)

If you need to revert:

1. **Restore imports**:
   ```python
   # consumer.py
   from services.inference import InferenceService
   self.inference_service = InferenceService()
   ```

2. **Restore config**:
   ```python
   NUM_HANDS = 2
   MEDIAPIPE_MAX_NUM_HANDS = 2
   ```

3. **Restore preprocessing** (revert to 2-hand logic)

4. **Restore consumer** (re-enable buffer wait)

Or use git:
```bash
git checkout HEAD -- back/app/consumer.py back/services/preprocessing.py back/config.py
```

---

## 📚 Additional Resources

- **Full migration details**: `ONNX_MIGRATION_SUMMARY.md`
- **Architecture diagrams**: `docs/ONNX_ARCHITECTURE.md`
- **ONNX Runtime docs**: https://onnxruntime.ai/docs/
- **MediaPipe docs**: https://developers.google.com/mediapipe

---

## ✅ Validation Checklist

Before deploying to production:

- [ ] ONNX model file exists at `back/models/lstm_best_acc0.9946.onnx`
- [ ] Dependencies installed (`onnxruntime` present)
- [ ] Server starts without errors
- [ ] Mock mode is OFF (check logs)
- [ ] Single hand detection works
- [ ] Predictions are accurate (test with known signs)
- [ ] Latency is acceptable (~100ms)
- [ ] No memory leaks (monitor over time)
- [ ] WebSocket connections stable

---

## 🆘 Support

If you encounter issues:

1. Check logs: `logs/server.log`
2. Verify model file: `ls -lh back/models/lstm_best_acc0.9946.onnx`
3. Test normalization: Run unit tests
4. Check dependencies: `pip list | grep onnx`
5. Review documentation: `ONNX_MIGRATION_SUMMARY.md`

---

**Version**: 1.0.0  
**Last Updated**: November 22, 2025  
**Status**: ✅ Ready for deployment
