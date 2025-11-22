# Q1: ONNX Model Input Shape Verification Report

**Date**: November 22, 2025  
**Model File**: `back/models/lstm_best_acc0.9946.onnx`  
**File Size**: 8.6 MB  
**Status**: ✅ Verified

---

## INSPECTION RESULTS

### Model Input Configuration

```
Name: landmarks
Shape: ['batch_size', 1, 21, 3]
Type: tensor(float)
```

**Breakdown**:

- **Batch size**: `'batch_size'` (dynamic - can be any value, typically 1)
- **Sequence length**: `1` ⚠️ **FIXED TO 1 FRAME**
- **Landmarks**: `21` (single hand keypoints)
- **Coordinates**: `3` (x, y, z)

### Model Output Configuration

```
Name: logits
Shape: ['batch_size', 29]
Type: tensor(float)
```

**Note**: Model outputs **29 classes** (not 26):

- 26 letters (A-Z)
- 3 special classes (likely: space, delete, nothing)

---

## 🚨 CRITICAL FINDING

### **The Model Was Exported for PER-FRAME Inference**

The ONNX model has a **hardcoded sequence length of 1**, meaning:

❌ **Cannot accept 32-frame sequences `[1, 32, 21, 3]`**  
✅ **Only accepts single frames `[1, 1, 21, 3]`**

### Current Behavior is CORRECT

The existing codebase in `back/services/onnx_predictor.py` is already using the model correctly:

```python
# Line 136-137
input_tensor = normalized.reshape(1, 1, 21, 3).astype(np.float32)
```

This matches the model's expected input shape: `['batch_size', 1, 21, 3]`

---

## 📊 IMPLICATIONS FOR MIGRATION PLAN

### Option 1: Re-Export Model with Sequence Length = 32 (RECOMMENDED)

**Action Required**:

1. Go to model training code: `model/src/export/export_onnx.py`
2. Re-export the trained checkpoint with `--sequence-length 32`
3. Replace `back/models/lstm_best_acc0.9946.onnx` with new export

**Command**:

```bash
cd model
python src/export/export_onnx.py \
  --checkpoint [path_to_checkpoint] \
  --output ../back/models/lstm_best_acc0.9946_seq32.onnx \
  --architecture lstm \
  --sequence-length 32 \
  --feature-dim 63
```

**Pros**:

- True LSTM sequence inference
- Better accuracy with temporal context
- Matches original design intent

**Cons**:

- Requires model re-export (access to training checkpoint needed)
- 1-2 second startup delay (32 frames @ 30fps)
- Increased memory usage

---

### Option 2: Export with Dynamic Sequence Length (FLEXIBLE)

**Action Required**:
Modify export script to use dynamic sequence length:

```python
# In export_onnx.py
torch.onnx.export(
    model,
    dummy,
    str(args.output),
    opset_version=args.opset,
    input_names=['landmarks'],
    output_names=['logits'],
    dynamic_axes={
        'landmarks': {0: 'batch_size', 1: 'seq_len'},  # Both batch and seq are dynamic
        'logits': {0: 'batch_size'}
    },
)
```

**Expected Output Shape**: `['batch_size', 'seq_len', 21, 3]`

**Pros**:

- Model accepts both single frames AND sequences
- Can switch between modes via config
- A/B testing capability

**Cons**:

- Requires model re-export
- More complex implementation

---

### Option 3: Keep Current Per-Frame Approach (NO CHANGES)

**Action Required**: None

**Rationale**:

- Model is already optimized for per-frame inference
- Lower latency (~100ms vs ~1-2s)
- Simpler architecture
- Better user experience (immediate feedback)

**Pros**:

- No code changes needed
- Lower latency
- Current implementation is correct

**Cons**:

- No LSTM temporal context benefits
- Lower accuracy potential
- Not using LSTM's sequence capabilities

---

## 🎯 RECOMMENDATION

### **Option 1: Re-Export with Sequence Length = 32**

**Reasoning**:

1. The model is named `lstm_best_acc0.9946.onnx` - it's an LSTM designed for sequences
2. The documentation consistently mentions 32-frame buffering
3. The buffer infrastructure is already built (just bypassed)
4. Higher accuracy potential with temporal context

**However, you need**:

- Access to the original PyTorch checkpoint (`.pt` file)
- The training configuration (hidden_dim, num_layers, etc.)

---

## 📝 QUESTIONS FOR YOU

### Before Proceeding with Migration:

**Q1a**: Do you have access to the original PyTorch checkpoint used to create this ONNX model?

- [ ] Yes, I have the `.pt` file
- [ ] No, I only have the ONNX file

**Q1b**: If yes, what are the model's training parameters?

- Hidden dimension: \_\_\_
- Number of layers: \_\_\_
- Architecture: lstm / tcn / mlp
- Bidirectional: yes / no

**Q1c**: What is your priority?

- [ ] **Accuracy** → Re-export with seq_len=32 (Option 1)
- [ ] **Latency** → Keep current per-frame approach (Option 3)
- [ ] **Flexibility** → Re-export with dynamic seq_len (Option 2)

---

## 🔄 REVISED MIGRATION PLAN

### If Re-Exporting Model (Option 1 or 2):

**New Phase 0: Model Re-Export** (Add 2-3 hours)

1. Locate original PyTorch checkpoint
2. Verify training configuration
3. Re-export with correct sequence length
4. Test new ONNX model
5. Replace old model file
6. Then proceed with original Phases 1-7

### If Keeping Current Approach (Option 3):

**No Migration Needed**

- Current implementation is already correct
- Model is working as designed
- Consider updating documentation to reflect per-frame design

---

## 📁 ADDITIONAL FINDINGS

### Output Classes Mismatch

**Expected** (from `config.py:33`):

```python
ONNX_NUM_CLASSES = 26  # A-Z
```

**Actual** (from model inspection):

```
Output shape: ['batch_size', 29]
```

**Action Required**:
Update `config.py` to reflect actual model output:

```python
ONNX_NUM_CLASSES = 29  # A-Z + 3 special classes (space, del, nothing)
```

---

## ✅ VERIFICATION CHECKLIST

- [x] Model file exists and is readable
- [x] Model input shape verified: `['batch_size', 1, 21, 3]`
- [x] Model output shape verified: `['batch_size', 29]`
- [x] Sequence length confirmed: **1 (per-frame)**
- [x] Dynamic dimensions identified: `batch_size`
- [x] Current code matches model expectations
- [ ] Decision made on migration path (pending your input)
- [ ] Original checkpoint located (if re-exporting)

---

## 🚀 NEXT STEPS

**Waiting for your decision**:

1. Answer Q1a, Q1b, Q1c above
2. Choose Option 1, 2, or 3
3. If Option 1/2: Provide checkpoint path and training config
4. If Option 3: Mark migration plan as "not needed"

**Once decided, I can**:

- Help re-export the model (if Option 1/2)
- Proceed with backend migration (if Option 1)
- Update documentation (if Option 3)

---

**Report Generated**: November 22, 2025  
**Status**: ⏸️ Awaiting Decision
