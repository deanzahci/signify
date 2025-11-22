# Phase 2 Implementation Summary

## ✅ ALL TASKS COMPLETED

### Services Implemented

#### 1. PreprocessingService (services/preprocessing.py)

**Purpose**: Extract hand landmarks from JPEG frames using MediaPipe

**Features**:

- MediaPipe Hands integration (max 2 hands)
- JPEG decoding with OpenCV
- Extracts 21 landmarks × 2 hands = 42 landmarks
- Returns numpy array shape (42, 3): [left_hand(21,3), right_hand(21,3)]
- Returns None if both hands not detected

**Key Methods**:

- `decode_jpeg(jpeg_bytes)` → RGB numpy array
- `extract_landmarks(image)` → (42, 3) array or None
- `process(jpeg_bytes)` → Combined pipeline

#### 2. InferenceService (services/inference.py)

**Purpose**: LSTM model wrapper with mock support

**Features**:

- Mock mode when model file doesn't exist
- Returns uniform distribution [1/26] × 26 in mock mode
- Ready to load real model when available
- Compatible with existing ASLPredictor interface

**Key Methods**:

- `__init__(model_path)` → Initializes in mock or real mode
- `predict(keypoint_sequence)` → List of 26 probabilities

**Input Format**: List of 32 arrays, each (42, 3)
**Output Format**: List of 26 floats (probabilities for A-Z)

#### 3. SmoothingService (services/smoothing.py)

**Purpose**: Temporal smoothing to reduce prediction jitter

**Features**:

- Sliding window averaging over 5 frames
- Element-wise average of probability distributions
- Works with RollingBuffer from Phase 1

**Key Methods**:

- `smooth(distributions)` → Averaged distribution
- `add_and_smooth(new_dist, buffer)` → Add and return smoothed

#### 4. ThrottlingService (services/throttling.py)

**Purpose**: Intelligent feedback control to reduce network load

**Features**:

- Time threshold: 75ms between sends
- Change threshold: 3% probability change OR letter change
- Force bypass for emergency resets

**Key Methods**:

- `should_send(maxarg, target_prob, force)` → Boolean decision
- `mark_sent(maxarg, target_prob)` → Update state
- `reset()` → Clear throttling state

---

## Configuration Updates (config.py)

```python
# Hand detection
MEDIAPIPE_MAX_NUM_HANDS = 2
NUM_HANDS = 2
HAND_LANDMARKS = 21
COORDS_PER_LANDMARK = 3
TOTAL_LANDMARKS = 42  # 21 × 2
LSTM_INPUT_DIM = 126  # 42 × 3

# Model path
LSTM_MODEL_PATH = BASE_DIR / "models" / "lstm_model.pt"
```

---

## Data Flow Architecture

```
JPEG bytes
    ↓
[PreprocessingService]
    ↓
(42, 3) landmarks
    ↓
[Append to keypoint_buffer] ×32
    ↓
List of 32 × (42, 3)
    ↓
[InferenceService - MOCK]
    ↓
[26 probabilities]
    ↓
[SmoothingService]
    ↓
Smoothed [26 probabilities]
    ↓
[ThrottlingService] → Decision to send
    ↓
{maxarg_letter, target_arg_prob}
```

---

## Model Compatibility

### Current Implementation (2 Hands)

- Input shape: `[1, 32, 42, 3]`
- Feature dim: 126 (42 landmarks × 3 coords)
- Output: 26 classes (A-Z)

### When Real Model is Ready

1. Train LSTM with `input_dim=126` (not 63)
2. Save checkpoint to `back/models/lstm_model.pt`
3. InferenceService will automatically switch from mock to real mode

---

## Test Results

All tests passing ✅

```
✓ test_phase1.py: PASSED (Phase 1 foundation)
✓ test_phase2_inference.py: PASSED (Mock inference)
✓ test_phase2_preprocessing.py: PASSED (JPEG decode, MediaPipe init)
✓ test_phase2_smoothing.py: PASSED (Averaging logic)
✓ test_phase2_throttling.py: PASSED (Throttling rules)

Total: 5/5 tests passed
```

---

## Next Steps

### Phase 3: Core Pipeline (Producer-Consumer)

- Implement Consumer (app/consumer.py)
- Implement Producer (app/producer.py)
- Integrate all services into pipeline

### Phase 4: WebSocket Server

- Implement main.py with WebSocket handling
- Connect Producer-Consumer to WebSocket
- Add error handling and logging

### Model Training

- Train LSTM with 2-hand data
- Input format: sequences of (42, 3) landmarks
- Save to back/models/lstm_model.pt

---

## Key Design Decisions

1. **2 Hands Required**: Both hands must be detected for valid input
2. **Non-flattened Format**: Keeps (landmarks, coords) structure for model
3. **Mock Mode**: Graceful degradation when model unavailable
4. **Easy Swap**: Model can be replaced without code changes
5. **Standardized Output**: Always list of 26 floats, sum to 1.0

---

## File Structure

```
back/
├── services/
│   ├── preprocessing.py    ✅ MediaPipe + JPEG decode
│   ├── inference.py        ✅ LSTM wrapper (mock)
│   ├── smoothing.py        ✅ Temporal averaging
│   └── throttling.py       ✅ Feedback control
├── models/
│   └── (lstm_model.pt)     📝 Awaiting trained model
├── test/
│   ├── test_phase2_preprocessing.py  ✅
│   ├── test_phase2_inference.py      ✅
│   ├── test_phase2_smoothing.py      ✅
│   └── test_phase2_throttling.py     ✅
└── config.py               ✅ Updated for 2 hands
```

---

Generated: $(date)
