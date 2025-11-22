# ONNX Integration Architecture

## System Architecture Comparison

### Before: PyTorch LSTM Pipeline
```
┌─────────────────┐
│  WebSocket      │
│  Frame (JPEG)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  PreprocessingService           │
│  - MediaPipe (2 hands required) │
│  - Extract L+R landmarks        │
│  - Output: (42, 3) array        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Keypoint Buffer                │
│  - Wait for 32 frames           │
│  - Stack to (32, 42, 3)         │
└────────┬────────────────────────┘
         │ (Only when full)
         ▼
┌─────────────────────────────────┐
│  InferenceService (PyTorch)     │
│  - Convert to tensor            │
│  - LSTM forward pass            │
│  - Output: (26,) distribution   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Smoothing (5 frame window)     │
│  - Average distributions        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Result: Letter + Probability   │
└─────────────────────────────────┘
```

**Latency**: ~32 frames + inference time  
**Requirements**: Both hands visible  
**Memory**: High (PyTorch + 32 frame buffer)

---

### After: ONNX Runtime Pipeline
```
┌─────────────────┐
│  WebSocket      │
│  Frame (JPEG)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  PreprocessingService           │
│  - MediaPipe (1 hand)           │
│  - Extract primary hand         │
│  - Output: (21, 3) array        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  ONNXPredictor                  │
│  - Normalize (wrist-relative)   │
│  - Scale (max abs)              │
│  - Reshape to [1,1,21,3]        │
│  - ONNX inference               │
│  - Output: (26,) distribution   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Smoothing (5 frame window)     │
│  - Average distributions        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Result: Letter + Probability   │
└─────────────────────────────────┘
```

**Latency**: Single frame + inference time  
**Requirements**: Any hand visible  
**Memory**: Low (ONNX Runtime + minimal buffer)

---

## Data Shape Transformations

### Old Pipeline (2 hands, 32 frames)
```
JPEG bytes
    ↓ decode
RGB image (H, W, 3)
    ↓ MediaPipe
2 hands: Left (21, 3) + Right (21, 3)
    ↓ vstack
Combined (42, 3)
    ↓ buffer x32
Sequence (32, 42, 3)
    ↓ flatten per frame
Sequence (32, 126)
    ↓ PyTorch LSTM
Logits (26,)
    ↓ softmax
Probabilities (26,)
```

### New Pipeline (1 hand, 1 frame)
```
JPEG bytes
    ↓ decode
RGB image (H, W, 3)
    ↓ MediaPipe
1 hand (21, 3)
    ↓ normalize
    coords = coords - coords[0]      # wrist-relative
    coords = coords / max(abs(coords))  # scale
Normalized (21, 3)
    ↓ reshape
Batch (1, 1, 21, 3)
    ↓ ONNX inference
Logits (26,)
    ↓ softmax
Probabilities (26,)
```

---

## Class Relationships

```
┌──────────────────────────────────────────────┐
│              Consumer                        │
│  - process_frame(jpeg_bytes)                 │
│  - Orchestrates pipeline                     │
└───────┬──────────────────────────────────────┘
        │ uses
        ├─────────────────────┬──────────────────┬─────────────────┐
        │                     │                  │                 │
        ▼                     ▼                  ▼                 ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐
│ Preprocessing    │  │ ONNXPredictor   │  │ Smoothing    │  │ Metrics     │
│ Service          │  │                 │  │ Service      │  │             │
├──────────────────┤  ├─────────────────┤  ├──────────────┤  ├─────────────┤
│ - decode_jpeg()  │  │ - normalize()   │  │ - add_smooth │  │ - record_   │
│ - extract_       │  │ - predict()     │  │ - window: 5  │  │   inference │
│   landmarks()    │  │ - predict_      │  │              │  │ - record_   │
│ - landmarks_to_  │  │   distribution()│  │              │  │   error     │
│   array()        │  │ - ONNX session  │  │              │  │             │
└──────────────────┘  └─────────────────┘  └──────────────┘  └─────────────┘
        │                     │
        │ uses                │ uses
        ▼                     ▼
┌──────────────────┐  ┌─────────────────┐
│ MediaPipe        │  │ ONNX Runtime    │
│ - Hands()        │  │ - Inference     │
│ - process()      │  │   Session       │
└──────────────────┘  └─────────────────┘
```

---

## Configuration Changes

### Key Constants
```python
# Before
NUM_HANDS = 2
MEDIAPIPE_MAX_NUM_HANDS = 2
TOTAL_LANDMARKS = 42
LSTM_INPUT_DIM = 126

# After
NUM_HANDS = 1
MEDIAPIPE_MAX_NUM_HANDS = 1
TOTAL_LANDMARKS = 21
LSTM_INPUT_DIM = 63

# New
ONNX_MODEL_PATH = "models/lstm_best_acc0.9946.onnx"
ONNX_NUM_CLASSES = 26
ONNX_SEQUENCE_LENGTH = 1
```

---

## File Structure

```
back/
├── models/
│   └── lstm_best_acc0.9946.onnx    ← NEW: ONNX model file
├── services/
│   ├── onnx_predictor.py           ← NEW: ONNX inference
│   ├── preprocessing.py            ← MODIFIED: Single hand
│   ├── inference.py                ← OLD: PyTorch (not used)
│   ├── smoothing.py                ← UNCHANGED
│   └── throttling.py               ← UNCHANGED
├── app/
│   ├── consumer.py                 ← MODIFIED: Use ONNXPredictor
│   ├── producer.py                 ← UNCHANGED
│   └── state.py                    ← UNCHANGED
├── config.py                       ← MODIFIED: New constants
├── requirements.txt                ← MODIFIED: Add onnxruntime
└── docs/
    └── ONNX_ARCHITECTURE.md        ← NEW: This file
```

---

## Performance Metrics

### Expected Improvements
| Metric | Old (PyTorch) | New (ONNX) | Improvement |
|--------|---------------|------------|-------------|
| **Latency** | ~1-2s (32 frames) | ~50-100ms | 10-20x faster |
| **Memory** | ~500MB | ~100MB | 5x reduction |
| **Startup** | ~5s | ~1s | 5x faster |
| **CPU Usage** | High | Medium | 30% reduction |

### Bottlenecks
1. **MediaPipe processing**: ~20-30ms per frame
2. **JPEG decode**: ~5-10ms per frame
3. **ONNX inference**: ~10-20ms per frame
4. **WebSocket latency**: ~5-10ms
5. **Smoothing buffer**: Adds 5 frames delay

**Total expected latency**: ~100-150ms from frame to result

---

## Testing Strategy

### Unit Tests
```python
# Test ONNX normalization
def test_normalize_landmarks():
    landmarks = np.random.rand(21, 3)
    normalized = predictor.normalize_landmarks(landmarks)
    assert normalized[0] == [0, 0, 0]  # Wrist at origin
    assert np.max(np.abs(normalized)) <= 1.0  # Scaled

# Test shape validation
def test_predict_shape():
    landmarks = np.random.rand(21, 3)
    letter, prob = predictor.predict(landmarks)
    assert letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    assert 0 <= prob <= 1
```

### Integration Tests
```python
# Test end-to-end pipeline
async def test_consumer_pipeline():
    jpeg_bytes = load_test_image()
    result = await consumer.process_frame(jpeg_bytes)
    assert result is not None
    assert 'maxarg_letter' in result
    assert 'target_arg_prob' in result
```

### Load Tests
```bash
# Benchmark inference speed
python -m pytest tests/ --benchmark-only

# Test WebSocket throughput
# Send 100 frames, measure latency distribution
```

---

## Troubleshooting

### Issue: "ONNX model not found"
**Solution**: 
```bash
ls -la back/models/lstm_best_acc0.9946.onnx
# If missing, copy model file to this location
```

### Issue: "No hands detected"
**Solution**: 
- Check lighting conditions
- Verify hand is visible in frame
- Tune `MEDIAPIPE_MIN_DETECTION_CONFIDENCE` (default: 0.5)

### Issue: "Predictions are noisy"
**Solution**:
- Increase `SLIDING_WINDOW_SIZE` (default: 5)
- Add confidence threshold filtering
- Improve lighting/hand positioning

### Issue: "High CPU usage"
**Solution**:
- Increase `THROTTLE_MIN_INTERVAL_MS` (default: 75)
- Reduce MediaPipe complexity
- Consider GPU acceleration for ONNX

---

## Future Enhancements

1. **GPU Acceleration**: Add CUDA/TensorRT providers for ONNX
2. **Confidence Threshold**: Filter low-confidence predictions
3. **Multi-hand Support**: Extend to handle 2-hand words
4. **Model Versioning**: Support multiple ONNX models
5. **A/B Testing**: Compare PyTorch vs ONNX accuracy
6. **Quantization**: Int8 ONNX model for even faster inference

---

**Last Updated**: November 22, 2025  
**Version**: 1.0.0  
**Status**: ✅ Ready for deployment
