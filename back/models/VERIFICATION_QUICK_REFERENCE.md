# ONNX Model Verification - Quick Reference

**Model**: `lstm_alphabet_sequence.onnx`  
**Status**: ✅ **VERIFIED - READY FOR INTEGRATION**  
**Date**: November 22, 2025

---

## 🎯 Key Findings

### Model Specifications
- **Input Shape**: `['batch', 'sequence', 63]`
- **Output Shape**: `['batch', 29]`
- **Sequence Length**: ✅ FULLY DYNAMIC (accepts any length)
- **Architecture**: Bidirectional LSTM with LayerNorm

### Critical Difference from Expected
⚠️ **Input format is FLATTENED (3D), not 4D**

| Expected | Actual |
|----------|--------|
| `[batch, seq, 21, 3]` | `[batch, seq, 63]` |
| 4D tensor | 3D tensor (flattened) |

**Solution**: Flatten landmarks before stacking
```python
# Per frame: (21, 3) → flatten() → (63,)
# Sequence: (32, 21, 3) → reshape(32, 63)
```

---

## ✅ Verification Checklist

- [x] Model file exists (8.6MB)
- [x] Input shape: `['batch', 'sequence', 63]`
- [x] Output shape: `['batch', 29]` 
- [x] Sequence dimension is DYNAMIC
- [x] Contains LSTM operators
- [x] 32-frame inference works
- [x] Multiple sequence lengths tested (1, 16, 32, 64, 128)
- [x] Normalized input works correctly
- [x] Output probabilities sum to 1.0

---

## 📊 Test Results Summary

| Test | Status | Details |
|------|--------|---------|
| Basic Inspection | ✅ PASS | Shape verified |
| Detailed Analysis | ✅ PASS | Dynamic seq confirmed |
| 32-Frame Inference | ✅ PASS | Output: [1, 29] |
| Dynamic Seq (1-128) | ✅ PASS | All lengths work |
| Normalized Input | ✅ PASS | Proper predictions |

---

## 🔧 Required Code Changes

### 1. Config Updates (`config.py`)
```python
ONNX_MODEL_PATH = BASE_DIR / "models" / "lstm_alphabet_sequence.onnx"
ONNX_NUM_CLASSES = 29  # Changed from 26
ONNX_SEQUENCE_LENGTH = 32
```

### 2. ONNXPredictor Changes (`services/onnx_predictor.py`)
**Add method**:
```python
def predict_sequence(self, landmarks_sequence: np.ndarray) -> Tuple[str, float]:
    # Input: (32, 21, 3)
    # 1. Normalize per frame
    # 2. Flatten per frame: (21, 3) → (63,)
    # 3. Stack: (32, 63)
    # 4. Add batch: (1, 32, 63)
    # 5. Run inference
    pass
```

### 3. Consumer Changes (`app/consumer.py`)
**Update pipeline**:
```python
# Wait for buffer full
if not self.state.keypoint_buffer.is_full():
    return {"maxarg_letter": "A", "target_arg_prob": 0.0}

# Get and stack 32 frames
sequence = self.state.keypoint_buffer.get_all()
sequence_array = np.stack(sequence, axis=0)  # (32, 21, 3)

# Call sequence prediction (handles flattening internally)
predicted_letter, confidence = await self._run_in_executor(
    self.onnx_predictor.predict_sequence, sequence_array
)
```

---

## 📏 Shape Transformations

```
Frame Input (from MediaPipe)
    ↓
(21, 3) - Single frame landmarks
    ↓ normalize
(21, 3) - Normalized
    ↓ flatten
(63,) - Flattened frame
    ↓ × 32 frames + stack
(32, 63) - Sequence
    ↓ add batch dimension
(1, 32, 63) - Model input
    ↓ LSTM inference
(1, 29) - Logits
    ↓ softmax
(29,) - Probabilities
```

---

## 🎨 29 Class Mapping

```
Classes 0-25:  A-Z (letters)
Class 26:      SPACE
Class 27:      DELETE
Class 28:      NOTHING
```

---

## 📈 Expected Performance

- **Initial Latency**: 1-2 seconds (32 frames @ 30fps)
- **Inference Time**: ~10-20ms per sequence
- **Memory Usage**: ~200KB for 32-frame buffer
- **Accuracy**: Higher than per-frame (temporal context)

---

## 🚀 Implementation Estimate

| Phase | Duration |
|-------|----------|
| Config updates | 30 min |
| ONNXPredictor modifications | 2 hours |
| Consumer pipeline changes | 2 hours |
| Testing & validation | 2 hours |
| Documentation | 1 hour |
| **TOTAL** | **7-8 hours** |

---

## 📚 Documentation

**Full Report**: `back/models/VERIFICATION_REPORT_lstm_alphabet_sequence.md`

**Contains**:
- Complete dimension analysis
- All test outputs
- Implementation code snippets
- Migration guide
- Risk assessment
- Troubleshooting tips

---

## ✨ Recommendation

**PROCEED WITH INTEGRATION**

The model is production-ready and exceeds expectations with fully dynamic sequence support. The flattened input format is easily handled with standard NumPy operations.

---

**Verified**: November 22, 2025  
**Agent**: OpenCode AI
