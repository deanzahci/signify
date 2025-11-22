# Greeting system interaction

**Session ID:** ses_5535c9295ffeLnZ87k7nbytE3r
**Created:** 11/22/2025, 9:36:22 AM
**Updated:** 11/22/2025, 10:07:29 AM

---

## User

hello

---

## Assistant

Hello! I'm OpenCode, here to help you with your software engineering tasks.

I can see you're working on a sign language recognition project called "signify" with:

- A React Native frontend (front/signify/)
- A Python backend with ONNX model inference (back/)
- Model training code (model/)

How can I help you today? I can assist with debugging, adding features, refactoring code, explaining how things work, or any other development tasks you have in mind.

---

## User

Context Gathering Prompt for Coding Agent
Project: Real-time ASL Recognition System (Signify - DAHacks 4.0)

Please analyze the current codebase and provide detailed information about the following areas:

1. Model Architecture & Inference
   What is the current model loading implementation? (ONNX Runtime setup, model initialization)

How is the model currently being used? (MLP forward pass vs LSTM with sequence input)

What are the current input tensor shapes being passed to the model?

What preprocessing steps are applied before inference?

Is there any LSTM-specific handling (hidden states, cell states, sequence batching)?

2. Data Buffering & Pipeline
   Is there a frame buffer implementation for accumulating 32 frames?

What is the current buffer data structure (FIFO queue, list, deque)?

How are MediaPipe keypoints being extracted and stored?

What is the shape of each frame's keypoint data? (Should be 258 features: hand landmarks)

Is the buffer reset when new_letter is received?

3. WebSocket Handler & Producer-Consumer Pattern
   What is the current WebSocket message handling implementation?

Is there an async Producer-Consumer pattern implemented?

How are frames currently queued or dropped during backpressure?

Is there Consumer task cancellation on new_letter events?

What is the current state management for current_target_letter?

4. Post-Processing & Smoothing
   Is there a sliding window implementation for temporal smoothing (averaging last 5 predictions)?

How are output probabilities extracted from the model?

How is maxarg_letter and target_arg_prob calculated?

Is there throttling logic based on time intervals and probability change thresholds?

5. File Structure & Dependencies
   What is the project directory structure?

Which files contain the inference pipeline logic?

What are the current dependencies? (ONNX Runtime, MediaPipe, asyncio libraries)

Where is the ONNX model file located?

6. LSTM Migration Gaps
   Critical: What needs to change to support LSTM inference instead of MLP?

Buffer management to collect 32-frame sequences

Input tensor reshaping from (1, 258) to (1, 32, 258)

LSTM state management (if stateful)

Sequence-aware inference logic

Please provide file paths, relevant code snippets, and identify any missing components needed to implement the LSTM-based pipeline as specified in the technical documentation.

---

## Assistant

I'll analyze your codebase to gather comprehensive information about the current implementation and identify gaps for LSTM migration. Let me start by exploring the key files systematically.

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now let me check the documentation files to understand the LSTM migration requirements:

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now let me check the model architecture and examine if we have the ONNX model file:

```
Tool: bash
```

```
Tool: read
```

```
Tool: bash
```

---

## Assistant

Let me use a different approach to check the model:

```
Tool: bash
```

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Now let me check the utils and async helpers:

```
Tool: read
```

```
Tool: read
```

```
Tool: bash
```

---

## Assistant

Now let me look at the TODO file and documentation to understand the LSTM migration gaps:

```
Tool: read
```

```
Tool: bash
```

---

## Assistant

```
Tool: read
```

```
Tool: read
```

---

## Assistant

Perfect! Now I have comprehensive understanding of the codebase. Let me create a detailed analysis document for you:

## 📋 **COMPREHENSIVE CONTEXT ANALYSIS: Real-time ASL Recognition System**

Based on my analysis of the codebase, here's the detailed information you requested:

---

## **1. MODEL ARCHITECTURE & INFERENCE**

### Current Model Loading Implementation

**Location**: `back/services/onnx_predictor.py:28-78`

**ONNX Runtime Setup**:

- **Model file**: `back/models/lstm_best_acc0.9946.onnx` (8.6MB, EXISTS ✓)
- **Session initialization**: ONNX Runtime with CPU/CUDA provider support
- **Input tensor name**: Retrieved dynamically via `session.get_inputs()[0].name`
- **Output tensor name**: Retrieved dynamically via `session.get_outputs()[0].name`
- **Providers**: Attempts GPU first (`CUDAExecutionProvider`), falls back to CPU
- **Mock mode**: Automatically enabled if model file not found (for development)

**Key Code**:

```python
# Line 57-59
providers = ["CPUExecutionProvider"]
if ort.get_device() == "GPU":
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
```

### Current Model Usage

**CRITICAL FINDING**: The system is currently using **per-frame inference**, NOT sequence-based LSTM inference!

**Current Implementation** (`onnx_predictor.py:107-163`):

- Takes **single frame** input: `(21, 3)` landmarks
- Reshapes to `[1, 1, 21, 3]` (batch=1, seq_len=1, landmarks=21, coords=3)
- Runs immediate inference on each frame
- No LSTM state management (hidden/cell states)
- No sequence accumulation for LSTM context

**Model Forward Pass**:

```python
# Line 136-142
normalized = self.normalize_landmarks(landmarks)
input_tensor = normalized.reshape(1, 1, 21, 3).astype(np.float32)
outputs = self.session.run([self.output_name], {self.input_name: input_tensor})
logits = outputs[0][0]  # Shape: (26,)
```

### Current Input Tensor Shapes

**Preprocessing Output**: `(21, 3)` - Single hand, single frame  
**ONNX Model Input**: `[1, 1, 21, 3]` - Batch of 1, sequence length 1  
**Expected LSTM Input**: `[1, 32, 21, 3]` - Batch of 1, **sequence length 32** ⚠️

### Preprocessing Steps

**Location**: `back/services/preprocessing.py:53-72`

1. **JPEG Decode** (line 29-39): Base64 → NumPy RGB array
2. **MediaPipe Processing** (line 60): Hand landmark detection
3. **Single Hand Selection** (line 67): Uses first detected hand (index 0)
4. **Landmark Extraction** (line 70): Converts to `(21, 3)` NumPy array

**Normalization** (`onnx_predictor.py:79-105`):

1. **Wrist-relative**: Subtract landmark[0] (wrist position)
2. **Scale normalization**: Divide by max absolute value

```python
# Line 94-104
coords = landmarks.copy().astype(np.float32)
wrist = coords[0].copy()
coords = coords - wrist  # Wrist at origin
max_abs = np.max(np.abs(coords))
if max_abs > 0:
    coords = coords / max_abs  # Size invariant
```

### LSTM-Specific Handling

**CRITICAL GAP**: ⚠️ **NO LSTM-SPECIFIC HANDLING IMPLEMENTED**

- ❌ No hidden state management
- ❌ No cell state management
- ❌ No sequence batching (32 frames)
- ❌ No stateful inference across frames

---

## **2. DATA BUFFERING & PIPELINE**

### Frame Buffer Implementation

**YES**, buffer exists but **NOT USED for inference**: `back/app/state.py:8`

```python
self.keypoint_buffer = RollingBuffer(max_size=KEYPOINT_BUFFER_SIZE)  # 32 frames
```

**Configuration**: `config.py:10`

```python
KEYPOINT_BUFFER_SIZE = 32  # Defined but bypassed
```

### Current Buffer Data Structure

**Location**: `back/utils/buffer.py:5-26`

- **Type**: `collections.deque` with fixed `maxlen=32`
- **Behavior**: FIFO queue (oldest frame auto-dropped when full)
- **Methods**:
  - `append(item)`: Add new frame
  - `clear()`: Reset buffer
  - `is_full()`: Check if 32 frames collected
  - `get_all()`: Return all frames as list

### How MediaPipe Keypoints are Stored

**Current Flow** (`consumer.py:54`):

```python
landmarks = await self._run_in_executor(
    self.preprocessing_service.process, jpeg_bytes
)  # Returns: (21, 3) numpy array

self.state.keypoint_buffer.append(landmarks)  # Stored but NOT used
```

**⚠️ CRITICAL ISSUE**: Buffer is populated but **bypassed for inference**:

```python
# Line 61-63
predicted_letter, confidence = await self._run_in_executor(
    self.onnx_predictor.predict, landmarks  # Uses SINGLE FRAME, not buffer!
)
```

### Shape of Each Frame's Keypoint Data

**Single Frame**: `(21, 3)` NumPy array

- **21 landmarks**: MediaPipe hand keypoints (0=WRIST, 1-4=THUMB, etc.)
- **3 coordinates**: x, y, z (normalized 0-1 range)

**Expected for LSTM**: After buffering 32 frames → `(32, 21, 3)`

### Buffer Reset on `new_letter`

**YES**, implemented: `producer.py:37-52`

```python
async def _emergency_reset(self, new_letter: str, websocket) -> None:
    # Cancel running inference
    if self.current_task and not self.current_task.done():
        self.current_task.cancel()

    # Reset state (includes buffer)
    self.state.reset(new_letter)  # Calls keypoint_buffer.clear()
    self.throttling_service.reset()

    # Send immediate feedback
    await self._send_response(websocket, maxarg_letter="A", target_arg_prob=0.0, force=True)
```

---

## **3. WEBSOCKET HANDLER & PRODUCER-CONSUMER PATTERN**

### Current WebSocket Message Handling

**Location**: `back/main.py:42-69`

**Server Class**: `SignifyServer`

- **Connection handler**: `handle_client()` - Async loop receiving messages
- **Message routing**: Delegates to `Producer.handle_message()`

**Producer Handler** (`producer.py:76-108`):

```python
async def handle_message(self, message: Any, websocket) -> None:
    parsed = self._parse_message(message)  # Validates JSON format
    jpeg_blob = parsed["jpeg_blob"]
    new_letter = parsed["new_word_letter"]

    if new_letter is not None:
        await self._emergency_reset(new_letter, websocket)

    if self._is_consumer_busy():
        # Backpressure: drop frame
        self.logger.debug("Consumer busy, dropping frame")
        self.metrics.record_dropped_frame()
        return

    # Spawn consumer task
    self.current_task = asyncio.create_task(self.consumer.process_frame(jpeg_blob))
```

### Async Producer-Consumer Pattern

**YES**, fully implemented:

**Producer** (`back/app/producer.py`):

- Listens to WebSocket messages
- Spawns Consumer tasks asynchronously
- Manages task lifecycle (create, cancel, cleanup)

**Consumer** (`back/app/consumer.py`):

- Runs in `ThreadPoolExecutor` (non-blocking)
- Processes frame through pipeline
- Returns result to Producer

**Key Pattern**:

```python
# Producer spawns consumer
self.current_task = asyncio.create_task(self.consumer.process_frame(jpeg_blob))

# Producer awaits result
result = await self.current_task

# Consumer runs CPU-bound work in executor
landmarks = await self._run_in_executor(self.preprocessing_service.process, jpeg_bytes)
```

### Frame Queuing/Dropping During Backpressure

**Implemented**: Drop strategy (no queuing)

**Logic** (`producer.py:87-90`):

```python
if self._is_consumer_busy():  # Checks if current_task is running
    self.logger.debug("Consumer busy, dropping frame (backpressure)")
    self.metrics.record_dropped_frame()
    return  # Frame dropped, not queued
```

**Rationale**: Prevents lag accumulation; always processes latest frame

### Consumer Task Cancellation on `new_letter`

**YES**, implemented: `producer.py:40-45`

```python
if self.current_task and not self.current_task.done():
    self.current_task.cancel()
    try:
        await self.current_task
    except asyncio.CancelledError:
        self.logger.debug("Consumer task cancelled successfully")
```

### Current State Management for `current_target_letter`

**Location**: `back/app/state.py:10`

```python
class PipelineState:
    def __init__(self):
        self.current_target_letter: Optional[str] = None

    def reset(self, new_target_letter: Optional[str] = None) -> None:
        self.current_target_letter = new_target_letter
```

**Usage**: Determines which probability to return (`consumer.py:86-109`)

---

## **4. POST-PROCESSING & SMOOTHING**

### Sliding Window Implementation

**YES**, implemented: `back/services/smoothing.py:5-36`

**Buffer**: `state.smoothing_buffer = RollingBuffer(max_size=SLIDING_WINDOW_SIZE)`  
**Window Size**: 5 frames (`config.py:11`)

**Algorithm**:

```python
def smooth(self, distributions: List[List[float]]) -> Optional[List[float]]:
    # Average each class probability across last N distributions
    averaged = []
    for i in range(num_classes):
        total = sum(dist[i] for dist in distributions)
        averaged.append(total / num_distributions)
    return averaged
```

### Probability Extraction

**Location**: `consumer.py:71-76`

```python
# Get full distribution from ONNX model
distribution = await self._run_in_executor(
    self.onnx_predictor.predict_distribution, landmarks
)
distribution_list = distribution.tolist()  # Convert NumPy to list
```

**ONNX Predictor** (`onnx_predictor.py:165-214`):

```python
# Run inference
outputs = self.session.run([self.output_name], {self.input_name: input_tensor})
logits = outputs[0][0]  # Shape: (26,)

# Apply softmax
exp_logits = np.exp(logits - np.max(logits))
probs = exp_logits / np.sum(exp_logits)
return probs  # NumPy array (26,)
```

### `maxarg_letter` and `target_arg_prob` Calculation

**Location**: `back/utils/metrics.py:14-32`

```python
def extract_metrics(probability_distribution: list, target_letter: Optional[str] = None) -> Tuple[str, float]:
    # maxarg_letter: highest probability class
    max_index = probability_distribution.index(max(probability_distribution))
    maxarg_letter = chr(ord("A") + max_index)

    # target_arg_prob: probability of target letter
    if target_letter is None:
        target_arg_prob = 0.0
    else:
        target_index = ord(target_letter.upper()) - ord("A")
        target_arg_prob = probability_distribution[target_index]

    return maxarg_letter, target_arg_prob
```

### Throttling Logic

**YES**, implemented: `back/services/throttling.py:7-43`

**Thresholds** (`config.py:13-14`):

```python
THROTTLE_MIN_INTERVAL_MS = 75  # Minimum time between responses
THROTTLE_PROBABILITY_THRESHOLD = 0.03  # 3% change required
```

**Logic**:

```python
def should_send(self, maxarg_letter: str, target_arg_prob: float) -> bool:
    # 1. Check time elapsed
    if time_elapsed_ms < THROTTLE_MIN_INTERVAL_MS:
        return False

    # 2. Check if letter changed
    letter_changed = self.last_maxarg_letter != maxarg_letter

    # 3. Check if probability changed significantly
    prob_diff = abs(target_arg_prob - self.last_target_arg_prob)
    prob_changed = prob_diff > THROTTLE_PROBABILITY_THRESHOLD

    return letter_changed or prob_changed
```

---

## **5. FILE STRUCTURE & DEPENDENCIES**

### Project Directory Structure

```
back/
├── main.py                      # WebSocket server entry point
├── config.py                    # All configuration constants
├── requirements.txt             # Dependencies (onnxruntime, mediapipe, etc.)
├── app/
│   ├── producer.py             # Input handler, emergency reset
│   ├── consumer.py             # Inference pipeline orchestration
│   └── state.py                # Buffer & target letter state
├── services/
│   ├── onnx_predictor.py       # ONNX model inference (CURRENT)
│   ├── inference.py            # PyTorch LSTM inference (OLD, unused)
│   ├── preprocessing.py        # MediaPipe landmark extraction
│   ├── smoothing.py            # Temporal averaging
│   └── throttling.py           # Response rate limiting
├── utils/
│   ├── buffer.py               # RollingBuffer (deque wrapper)
│   ├── metrics.py              # Performance tracking
│   ├── async_helpers.py        # Message validation, formatting
│   └── logging_config.py       # Logging setup
├── models/
│   └── lstm_best_acc0.9946.onnx  # ONNX model file (8.6MB)
└── tests/                       # Comprehensive test suite
```

### Inference Pipeline Logic Files

**Primary**:

- `app/consumer.py`: Pipeline orchestration
- `services/onnx_predictor.py`: Model inference
- `services/preprocessing.py`: Landmark extraction

**Supporting**:

- `services/smoothing.py`: Temporal smoothing
- `services/throttling.py`: Response throttling
- `app/state.py`: State management

### Current Dependencies

**Location**: `back/requirements.txt`

```
mediapipe>=0.10.21        # Hand landmark detection
numpy>=1.26.4             # Numerical operations
onnxruntime>=1.16.0       # ONNX model inference
opencv-python-headless>=4.11.0.86  # Image decoding
websockets>=15.0.1        # WebSocket server
```

**Missing for LSTM**:

- ❌ No PyTorch (if switching back to PyTorch LSTM)
- ✓ ONNX Runtime supports LSTM operations

### ONNX Model File Location

**Path**: `/Users/koichi/Projects/signify/back/models/lstm_best_acc0.9946.onnx`  
**Status**: ✅ **EXISTS** (8.6MB)  
**Config Reference**: `config.py:32`

---

## **6. LSTM MIGRATION GAPS** ⚠️

### **CRITICAL: What Needs to Change**

#### **A. Buffer Management** ❌ NOT IMPLEMENTED

**Current State**:

```python
# consumer.py:54 - Buffer is filled but IGNORED
self.state.keypoint_buffer.append(landmarks)  # Added to buffer
predicted_letter, confidence = await self._run_in_executor(
    self.onnx_predictor.predict, landmarks  # ❌ Uses SINGLE FRAME!
)
```

**Required Changes**:

1. **Wait for 32 frames before inference**:

```python
# After appending to buffer
if not self.state.keypoint_buffer.is_full():
    self.logger.debug("Buffer not full yet, waiting...")
    return None  # Skip inference

# Get sequence of 32 frames
sequence = self.state.keypoint_buffer.get_all()  # Returns list of (21, 3) arrays
```

2. **Stack frames into sequence**:

```python
sequence_array = np.stack(sequence, axis=0)  # Shape: (32, 21, 3)
```

#### **B. Input Tensor Reshaping** ❌ NOT IMPLEMENTED

**Current** (`onnx_predictor.py:136-137`):

```python
input_tensor = normalized.reshape(1, 1, 21, 3).astype(np.float32)
# Shape: [batch=1, seq_len=1, landmarks=21, coords=3]
```

**Required for LSTM**:

```python
input_tensor = sequence_array.reshape(1, 32, 21, 3).astype(np.float32)
# Shape: [batch=1, seq_len=32, landmarks=21, coords=3]
```

**Changes Needed**:

- Modify `ONNXPredictor.predict()` to accept sequences, not single frames
- Create new method: `predict_sequence(sequence: np.ndarray)` with shape `(32, 21, 3)`

#### **C. LSTM State Management** ⚠️ DEPENDS ON MODEL

**Question**: Does the ONNX model export include stateful LSTM or stateless?

**If Stateless** (most likely for your model):

- No hidden/cell state management needed
- Each 32-frame sequence is independent
- ✅ Current architecture OK

**If Stateful** (less common):

- Need to maintain `hidden_state` and `cell_state` across calls
- Reset states on `new_letter`
- Pass states to ONNX model as additional inputs

**To Verify**: Check ONNX model inputs:

```python
for input in session.get_inputs():
    print(input.name, input.shape)
# Expected: ['input', [1, 32, 21, 3]]
# If stateful: ['input', 'hidden_state', 'cell_state']
```

#### **D. Sequence-Aware Inference Logic** ❌ NOT IMPLEMENTED

**Required Changes in `consumer.py:process_frame()`**:

```python
# Current (line 44-109)
async def process_frame(self, jpeg_bytes: bytes) -> Optional[Dict]:
    # 1. Extract landmarks
    landmarks = await self._run_in_executor(...)  # (21, 3)

    # 2. Append to buffer
    self.state.keypoint_buffer.append(landmarks)

    # ❌ MISSING: Check if buffer full
    if not self.state.keypoint_buffer.is_full():
        return None

    # ❌ MISSING: Get 32-frame sequence
    sequence = self.state.keypoint_buffer.get_all()  # List[(21,3), ...]
    sequence_array = np.stack(sequence, axis=0)  # (32, 21, 3)

    # 3. Run inference on SEQUENCE (not single frame)
    distribution = await self._run_in_executor(
        self.onnx_predictor.predict_sequence, sequence_array  # ❌ Method doesn't exist
    )

    # 4. Rest of pipeline (smoothing, metrics) remains same
```

---

## **MISSING COMPONENTS SUMMARY**

| Component                               | Status         | Priority    | Location                |
| --------------------------------------- | -------------- | ----------- | ----------------------- |
| **32-frame sequence collection**        | ❌ Bypassed    | 🔴 CRITICAL | `consumer.py:54-63`     |
| **Buffer full check before inference**  | ❌ Missing     | 🔴 CRITICAL | `consumer.py`           |
| **Sequence stacking (32,21,3)**         | ❌ Missing     | 🔴 CRITICAL | `consumer.py`           |
| **ONNX predictor sequence method**      | ❌ Missing     | 🔴 CRITICAL | `onnx_predictor.py`     |
| **Input tensor reshaping [1,32,21,3]**  | ❌ Wrong shape | 🔴 CRITICAL | `onnx_predictor.py:137` |
| **LSTM state management**               | ⚠️ Unknown     | 🟡 DEPENDS  | Model-dependent         |
| **Normalization per-frame vs sequence** | ⚠️ Unclear     | 🟡 VERIFY   | `onnx_predictor.py:79`  |

---

## **RECOMMENDATIONS**

### **Immediate Next Steps**:

1. **Verify ONNX Model Expected Input**:

   ```bash
   python -c "import onnxruntime as ort; sess = ort.InferenceSession('back/models/lstm_best_acc0.9946.onnx'); print(sess.get_inputs()[0].shape)"
   ```

   - If output is `[1, 1, 21, 3]` → Model was exported for per-frame (current behavior is correct)
   - If output is `[1, 32, 21, 3]` or `[1, 'seq_len', 21, 3]` → Need sequence-based changes

2. **Modify `ONNXPredictor` for Sequences**:
   - Add `predict_sequence()` method
   - Handle `(32, 21, 3)` input
   - Apply normalization per-frame within sequence

3. **Update Consumer Pipeline**:
   - Enforce buffer full check
   - Stack 32 frames before inference
   - Pass sequence to predictor

4. **Test End-to-End**:
   - Verify latency (~32 frames delay expected)
   - Check prediction accuracy improves with temporal context

---

**Total Files Analyzed**: 25+  
**Critical Gap Identified**: Per-frame inference instead of 32-frame sequence LSTM  
**Estimated Effort**: 4-6 hours to migrate to sequence-based LSTM inference

Would you like me to proceed with implementing the LSTM sequence-based inference pipeline?

---

## User

Make a detailed plan and todos for this. If you don't understand properly, ask me a follow up question. Objective: Restore the codebase to use 32-frame sequence batching for LSTM inference instead of per-frame MLP-style inference.

Critical Changes Required:

1. Restore ONNX Predictor Input Shape
   File: back/services/onnx_predictor.py

Current (MLP mode): Line 136-137

python
input_tensor = normalized.reshape(1, 1, 21, 3).astype(np.float32) # ❌ seq_len=1
Target (LSTM mode):

python
input_tensor = sequence_array.reshape(1, 32, 21, 3).astype(np.float32) # ✓ seq_len=32
Action: Modify predict() or create predict_sequence() method to accept (32, 21, 3) input and reshape to [1, 32, 21, 3].

---

## Assistant

I'll create a comprehensive plan for restoring 32-frame sequence batching for LSTM inference. Let me first ask some clarifying questions and then inspect a few critical aspects:

## **Clarifying Questions:**

1. **ONNX Model Input Shape**: What is the actual expected input shape of the ONNX model? Should I verify this first, or do you already know it expects `[1, 32, 21, 3]`?

2. **Normalization Strategy**: Should normalization be applied:
   - **Per-frame** (normalize each of 32 frames independently, then stack), OR
   - **Per-sequence** (stack 32 frames, then normalize the entire sequence)?

3. **Backward Compatibility**: Do you want to:
   - **Completely remove** per-frame inference (breaking change), OR
   - **Keep both modes** with a config flag (e.g., `INFERENCE_MODE = "sequence" | "frame"`)?

4. **Smoothing Buffer Interaction**: Currently, smoothing happens on the **output distribution** (averaging last 5 predictions). With 32-frame buffering:
   - Keep smoothing as-is (smooth over sequences)?
   - Remove smoothing (sequence context may make it redundant)?
   - Adjust smoothing window size?

5. **Initial Startup Behavior**: For the first 31 frames after `new_letter` reset:
   - Return `None` (no prediction until buffer full)?
   - Return a default/placeholder response?
   - Pad sequence with zeros/last-frame-repeat?

Let me also verify the current model's expected input shape:

```
Tool: bash
```

```
Tool: bash
```

```
Tool: bash
```

---

## Assistant

```
Tool: bash
```

```
Tool: bash
```

```
Tool: bash
```

---

## Assistant

Perfect! Now I can see the documentation confirms **32 frames** is the target. Let me check one more thing about the model architecture:

```
Tool: bash
```

```
Tool: bash
```

---

## Assistant

Now let me check the old PyTorch inference service to understand the original sequence-based implementation:

```
Tool: read
```

```
Tool: bash
```

---

## Assistant

Excellent! Now I have all the context. Let me create a comprehensive plan:

---

# **🎯 DETAILED MIGRATION PLAN: Restore 32-Frame Sequence LSTM Inference**

## **📋 EXECUTIVE SUMMARY**

**Objective**: Restore the codebase from per-frame MLP-style inference to 32-frame sequence batching for LSTM inference.

**Current State**: System performs immediate per-frame inference with `[1, 1, 21, 3]` input  
**Target State**: System buffers 32 frames and performs sequence inference with `[1, 32, 21, 3]` input  
**Estimated Effort**: 6-8 hours  
**Risk Level**: Medium (may affect latency/UX)

---

## **❓ CLARIFICATION QUESTIONS (Answer before proceeding)**

### **Q1: ONNX Model Input Shape Verification**

**Question**: Can you run this command to verify the model's expected input shape?

```bash
cd back && python3 -c "import onnxruntime as ort; sess = ort.InferenceSession('models/lstm_best_acc0.9946.onnx'); print('Input shape:', sess.get_inputs()[0].shape)"
```

**Expected**: `[1, 32, 21, 3]` or `['batch', 32, 21, 3]` or `[1, 'seq_len', 21, 3]`  
**If different**: We may need to adjust the plan

### **Q2: Normalization Strategy**

**Choose one**:

- **Option A**: Normalize each frame independently, then stack → `[normalize(frame_1), ..., normalize(frame_32)]`
- **Option B**: Stack frames first, then normalize entire sequence → `normalize(stacked_sequence)`

**Recommendation**: Option A (per-frame normalization) to match training preprocessing

### **Q3: Backward Compatibility**

**Choose one**:

- **Option A**: Complete replacement (remove per-frame mode entirely)
- **Option B**: Dual mode with config flag `INFERENCE_MODE = "sequence" | "frame"`

**Recommendation**: Option A for simplicity, unless you need A/B testing

### **Q4: Smoothing Buffer**

**Choose one**:

- **Option A**: Keep smoothing (average last 5 sequence predictions)
- **Option B**: Remove smoothing (LSTM temporal context may make it redundant)
- **Option C**: Reduce smoothing window (e.g., 3 instead of 5)

**Recommendation**: Option C (reduce to 3) since LSTM already has temporal context

### **Q5: Initial Startup Behavior**

**When buffer has < 32 frames, choose one**:

- **Option A**: Return `None` (no prediction sent to client)
- **Option B**: Send default response `{"maxarg_letter": "A", "target_arg_prob": 0.0}`
- **Option C**: Pad sequence with zeros/duplicates and run inference anyway

**Recommendation**: Option B (send default response) for better UX feedback

---

## **📊 IMPACT ANALYSIS**

### **Files to Modify**

| File                                    | Changes                        | Lines Affected | Complexity |
| --------------------------------------- | ------------------------------ | -------------- | ---------- |
| `back/services/onnx_predictor.py`       | Add sequence prediction method | ~50 lines      | Medium     |
| `back/app/consumer.py`                  | Restore buffer-wait logic      | ~30 lines      | Medium     |
| `back/config.py`                        | Add sequence config (optional) | ~5 lines       | Low        |
| `back/tests/test_phase2_inference.py`   | Update tests for sequences     | ~20 lines      | Low        |
| `back/tests/test_phase3_integration.py` | Update integration tests       | ~15 lines      | Low        |

### **Behavioral Changes**

| Aspect         | Before                            | After                                   | Impact                |
| -------------- | --------------------------------- | --------------------------------------- | --------------------- |
| **Latency**    | ~50-100ms (immediate)             | ~1-2s (32 frames @ 30fps)               | 🔴 UX degradation     |
| **Accuracy**   | Lower (no temporal context)       | Higher (LSTM temporal context)          | 🟢 Better predictions |
| **Cold Start** | Immediate prediction              | 32 frames delay                         | 🔴 Initial delay      |
| **Memory**     | Low (1 frame)                     | Medium (32 frames)                      | 🟡 Acceptable         |
| **CPU Usage**  | Lower (frequent small inferences) | Higher (less frequent large inferences) | 🟡 Neutral            |

---

## **🗂️ DETAILED TASK BREAKDOWN**

### **PHASE 1: Pre-Flight Verification** ✈️

**Duration**: 30 minutes  
**Risk**: Low

#### **Task 1.1: Verify ONNX Model Input Shape**

- [ ] Run `onnxruntime` inspection command (see Q1 above)
- [ ] Document actual input shape
- [ ] Verify output shape is `[1, 26]` (26 classes A-Z)
- [ ] Check if model has additional inputs (hidden/cell states)

**Deliverable**: Model inspection report

#### **Task 1.2: Review Historical Implementation**

- [ ] Read `back/services/inference.py` (old PyTorch approach) - Line 36-40
- [ ] Understand sequence stacking: `np.stack(keypoint_sequence, axis=0)`
- [ ] Document original buffer-wait logic from docs

**Deliverable**: Implementation reference notes

#### **Task 1.3: Decide Configuration Questions**

- [ ] Answer Q1-Q5 above
- [ ] Document decisions in MIGRATION_DECISIONS.md

**Deliverable**: Decision log

---

### **PHASE 2: ONNX Predictor Modification** 🔧

**Duration**: 2 hours  
**Risk**: Medium

#### **Task 2.1: Create `predict_sequence()` Method**

**File**: `back/services/onnx_predictor.py`  
**Location**: After `predict()` method (line ~164)

**Implementation**:

```python
def predict_sequence(self, landmarks_sequence: np.ndarray) -> Tuple[str, float]:
    """
    Run inference on 32-frame sequence of hand landmarks.

    Args:
        landmarks_sequence: numpy array of shape (32, 21, 3) - 32 frames of single hand

    Returns:
        Tuple of (predicted_letter, confidence)
    """
    try:
        # Validate input shape
        if landmarks_sequence.shape != (32, 21, 3):
            raise ValueError(
                f"Expected landmarks_sequence shape (32, 21, 3), got {landmarks_sequence.shape}"
            )

        # Mock mode for development/testing
        if self.mock_mode:
            import time
            mock_class_idx = int(time.time() / 2.0) % self.num_classes
            predicted_letter = chr(ord("A") + mock_class_idx)
            return predicted_letter, 0.95

        # Apply normalization PER FRAME (Option A from Q2)
        normalized_sequence = np.zeros_like(landmarks_sequence)
        for i in range(32):
            normalized_sequence[i] = self.normalize_landmarks(landmarks_sequence[i])

        # Reshape for ONNX model: [batch=1, seq_len=32, landmarks=21, coords=3]
        input_tensor = normalized_sequence.reshape(1, 32, 21, 3).astype(np.float32)

        # Run inference
        outputs = self.session.run(
            [self.output_name], {self.input_name: input_tensor}
        )

        # Get logits/probabilities
        logits = outputs[0][0]  # Shape: (26,)

        # Apply softmax
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)

        # Get top prediction
        top_idx = np.argmax(probs)
        top_prob = probs[top_idx]

        # Convert index to letter
        predicted_letter = chr(ord("A") + top_idx)

        return predicted_letter, float(top_prob)

    except Exception as e:
        self.logger.error(f"Sequence prediction failed: {e}", exc_info=True)
        return "A", 0.0
```

**Checklist**:

- [ ] Add method after existing `predict()` method
- [ ] Add comprehensive docstring
- [ ] Validate input shape `(32, 21, 3)`
- [ ] Apply per-frame normalization in loop
- [ ] Reshape to `[1, 32, 21, 3]`
- [ ] Handle mock mode fallback
- [ ] Add error handling
- [ ] Add logging for debugging

#### **Task 2.2: Create `predict_sequence_distribution()` Method**

**File**: `back/services/onnx_predictor.py`  
**Location**: After `predict_sequence()` method

**Implementation**:

```python
def predict_sequence_distribution(self, landmarks_sequence: np.ndarray) -> np.ndarray:
    """
    Return full probability distribution over all classes for 32-frame sequence.

    Args:
        landmarks_sequence: numpy array of shape (32, 21, 3)

    Returns:
        numpy array of shape (26,) with probabilities for A-Z
    """
    try:
        if landmarks_sequence.shape != (32, 21, 3):
            raise ValueError(
                f"Expected landmarks_sequence shape (32, 21, 3), got {landmarks_sequence.shape}"
            )

        # Mock mode
        if self.mock_mode:
            import time
            mock_class_idx = int(time.time() / 2.0) % self.num_classes
            probs = np.full(self.num_classes, 0.002, dtype=np.float32)
            probs[mock_class_idx] = 0.95
            return probs

        # Apply normalization per frame
        normalized_sequence = np.zeros_like(landmarks_sequence)
        for i in range(32):
            normalized_sequence[i] = self.normalize_landmarks(landmarks_sequence[i])

        # Reshape for ONNX model
        input_tensor = normalized_sequence.reshape(1, 32, 21, 3).astype(np.float32)

        # Run inference
        outputs = self.session.run(
            [self.output_name], {self.input_name: input_tensor}
        )

        # Get probabilities
        logits = outputs[0][0]
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)

        return probs

    except Exception as e:
        self.logger.error(f"Sequence distribution prediction failed: {e}", exc_info=True)
        return np.ones(self.num_classes, dtype=np.float32) / self.num_classes
```

**Checklist**:

- [ ] Add method for full distribution
- [ ] Reuse normalization logic
- [ ] Return full probability array
- [ ] Add error handling

#### **Task 2.3: Update Existing Methods (Optional)**

**Decision Point**: Keep old `predict()` for backward compatibility or deprecate?

**If deprecating**:

- [ ] Add deprecation warning to `predict()` method
- [ ] Update docstring to recommend `predict_sequence()`

**If keeping dual mode**:

- [ ] Add config check `if config.INFERENCE_MODE == "sequence"`
- [ ] No changes needed

---

### **PHASE 3: Consumer Pipeline Restoration** 🔄

**Duration**: 2 hours  
**Risk**: Medium

#### **Task 3.1: Restore Buffer-Wait Logic**

**File**: `back/app/consumer.py`  
**Location**: `process_frame()` method (line 33-114)

**Current Code** (lines 54-63):

```python
# 2. Keep buffering for future sequence models (optional)
self.state.keypoint_buffer.append(landmarks)
self.logger.debug(
    f"Buffered landmarks: {len(self.state.keypoint_buffer)}/32 "
    f"(buffer maintained but not used for ONNX inference)"
)

# 3. Run inference immediately on current frame (bypass buffer)
predicted_letter, confidence = await self._run_in_executor(
    self.onnx_predictor.predict, landmarks
)
```

**New Code**:

```python
# 2. Buffer landmarks until we have 32 frames
self.state.keypoint_buffer.append(landmarks)
self.logger.debug(
    f"Buffered landmarks: {len(self.state.keypoint_buffer)}/32"
)

# 3. Check if buffer is full (32 frames required for LSTM)
if not self.state.keypoint_buffer.is_full():
    self.logger.debug("Buffer not full yet, waiting for more frames")
    # Return default response for UX feedback (Option B from Q5)
    return {"maxarg_letter": "A", "target_arg_prob": 0.0}

# 4. Get sequence of 32 frames
sequence = self.state.keypoint_buffer.get_all()  # Returns List[np.ndarray]
if sequence is None:
    self.logger.warning("Buffer full but get_all() returned None")
    return None

# 5. Stack frames into sequence array
sequence_array = np.stack(sequence, axis=0)  # Shape: (32, 21, 3)
self.logger.debug(f"Stacked sequence shape: {sequence_array.shape}")

# 6. Run inference on 32-frame sequence
predicted_letter, confidence = await self._run_in_executor(
    self.onnx_predictor.predict_sequence, sequence_array
)
```

**Checklist**:

- [ ] Replace per-frame inference with sequence inference
- [ ] Add buffer full check
- [ ] Return early if buffer not full (with default response)
- [ ] Stack frames using `np.stack()`
- [ ] Call new `predict_sequence()` method
- [ ] Update debug logging messages
- [ ] Test with 31 frames, 32 frames, 33 frames

#### **Task 3.2: Update Distribution Prediction**

**File**: `back/app/consumer.py`  
**Location**: Lines 70-76

**Current Code**:

```python
distribution = await self._run_in_executor(
    self.onnx_predictor.predict_distribution, landmarks
)
```

**New Code**:

```python
distribution = await self._run_in_executor(
    self.onnx_predictor.predict_sequence_distribution, sequence_array
)
```

**Checklist**:

- [ ] Replace `predict_distribution` with `predict_sequence_distribution`
- [ ] Pass `sequence_array` instead of `landmarks`

#### **Task 3.3: Update Logging and Metrics**

**File**: `back/app/consumer.py`  
**Location**: Lines 65, 94-99

**Updates**:

- [ ] Change "Raw ONNX prediction" to "LSTM sequence prediction"
- [ ] Add log for sequence shape
- [ ] Add log for buffer fill progress

---

### **PHASE 4: Configuration Updates** ⚙️

**Duration**: 30 minutes  
**Risk**: Low

#### **Task 4.1: Add Sequence Configuration (Optional)**

**File**: `back/config.py`  
**Location**: After line 34

**If dual-mode support needed**:

```python
# Inference mode: "sequence" (LSTM 32-frame) or "frame" (MLP single-frame)
INFERENCE_MODE = os.getenv("INFERENCE_MODE", "sequence")  # Default: sequence
```

**If sequence-only**:

```python
# LSTM inference requires 32-frame sequences
LSTM_SEQUENCE_LENGTH = 32  # Do not change without retraining model
```

**Checklist**:

- [ ] Add configuration constant
- [ ] Document expected behavior
- [ ] Add validation if needed

#### **Task 4.2: Update Smoothing Window (Recommended)**

**File**: `back/config.py`  
**Location**: Line 11

**Current**:

```python
SLIDING_WINDOW_SIZE = 5
```

**Recommended** (Option C from Q4):

```python
SLIDING_WINDOW_SIZE = 3  # Reduced from 5 since LSTM has temporal context
```

**Checklist**:

- [ ] Update smoothing window size
- [ ] Add comment explaining why reduced

---

### **PHASE 5: Testing & Validation** 🧪

**Duration**: 2 hours  
**Risk**: Low

#### **Task 5.1: Unit Tests - ONNX Predictor**

**File**: `back/tests/test_phase2_inference.py` (or create new test file)

**Tests to add**:

```python
def test_predict_sequence():
    """Test sequence prediction with 32 frames"""
    predictor = ONNXPredictor()
    sequence = np.random.rand(32, 21, 3).astype(np.float32)
    letter, confidence = predictor.predict_sequence(sequence)
    assert letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    assert 0 <= confidence <= 1

def test_predict_sequence_wrong_shape():
    """Test sequence prediction fails with wrong shape"""
    predictor = ONNXPredictor()
    sequence = np.random.rand(16, 21, 3).astype(np.float32)  # Wrong: 16 frames
    with pytest.raises(ValueError):
        predictor.predict_sequence(sequence)

def test_predict_sequence_distribution():
    """Test sequence distribution returns full probabilities"""
    predictor = ONNXPredictor()
    sequence = np.random.rand(32, 21, 3).astype(np.float32)
    probs = predictor.predict_sequence_distribution(sequence)
    assert probs.shape == (26,)
    assert np.isclose(np.sum(probs), 1.0)

def test_normalization_per_frame():
    """Test that normalization is applied to each frame"""
    predictor = ONNXPredictor()
    sequence = np.random.rand(32, 21, 3).astype(np.float32)
    # Manually normalize and compare
    # (Test implementation details)
```

**Checklist**:

- [ ] Test correct shape input
- [ ] Test incorrect shape (should raise error)
- [ ] Test mock mode behavior
- [ ] Test normalization
- [ ] Test output format

#### **Task 5.2: Integration Tests - Consumer Pipeline**

**File**: `back/tests/test_phase3_integration.py`

**Tests to update**:

```python
async def test_consumer_waits_for_32_frames():
    """Test consumer waits until buffer has 32 frames"""
    consumer = Consumer(state, executor)

    # Send 31 frames - should return default response
    for i in range(31):
        result = await consumer.process_frame(mock_jpeg_bytes)
        assert result == {"maxarg_letter": "A", "target_arg_prob": 0.0}

    # Send 32nd frame - should return real prediction
    result = await consumer.process_frame(mock_jpeg_bytes)
    assert result is not None
    assert "maxarg_letter" in result
    assert result["maxarg_letter"] != "A" or result["target_arg_prob"] > 0.0

async def test_emergency_reset_clears_buffer():
    """Test that emergency reset clears the 32-frame buffer"""
    # Fill buffer with 32 frames
    for i in range(32):
        await consumer.process_frame(mock_jpeg_bytes)

    # Trigger reset
    state.reset("B")

    # Verify buffer cleared
    assert len(state.keypoint_buffer) == 0

    # Next frame should wait again
    result = await consumer.process_frame(mock_jpeg_bytes)
    assert result == {"maxarg_letter": "A", "target_arg_prob": 0.0}
```

**Checklist**:

- [ ] Test buffer filling behavior (1-31 frames)
- [ ] Test inference at 32nd frame
- [ ] Test buffer reset on `new_letter`
- [ ] Test sequence stacking
- [ ] Test end-to-end with real JPEG

#### **Task 5.3: Manual Testing**

**Environment**: Local development server

**Test Cases**:

1. **Cold Start Test**:
   - [ ] Start server
   - [ ] Connect WebSocket client
   - [ ] Send 1 frame → Should receive default response
   - [ ] Send 31 more frames → Should receive real prediction on 32nd

2. **Emergency Reset Test**:
   - [ ] Send 32 frames (buffer full)
   - [ ] Send `new_letter: "B"` → Should receive immediate reset response
   - [ ] Send 1 frame → Should receive default response (buffer reset)

3. **Continuous Operation Test**:
   - [ ] Send 100+ frames continuously
   - [ ] Verify predictions every frame after initial 32
   - [ ] Check for memory leaks

4. **Performance Test**:
   - [ ] Measure latency (should be ~1-2s initially, then real-time)
   - [ ] Monitor CPU usage
   - [ ] Monitor memory usage

**Checklist**:

- [ ] Run all manual tests
- [ ] Document latency measurements
- [ ] Verify no errors in logs

---

### **PHASE 6: Documentation Updates** 📝

**Duration**: 1 hour  
**Risk**: Low

#### **Task 6.1: Update ONNX Migration Summary**

**File**: `back/ONNX_MIGRATION_SUMMARY.md`

**Updates**:

- [ ] Change "Per-frame inference" to "Sequence-based inference"
- [ ] Update data flow diagram to show 32-frame buffering
- [ ] Update input shape from `[1, 1, 21, 3]` to `[1, 32, 21, 3]`
- [ ] Update latency expectations

#### **Task 6.2: Update Architecture Documentation**

**File**: `back/docs/ONNX_ARCHITECTURE.md`

**Updates**:

- [ ] Restore 32-frame buffer requirement in architecture diagram
- [ ] Update "After: ONNX Runtime Pipeline" section
- [ ] Update performance metrics (latency ~1-2s)

#### **Task 6.3: Update Quickstart Guide**

**File**: `back/QUICKSTART_ONNX.md`

**Updates**:

- [ ] Add note about 32-frame startup delay
- [ ] Update expected behavior section
- [ ] Add troubleshooting for "slow initial response"

#### **Task 6.4: Create Migration Summary**

**File**: `back/SEQUENCE_MIGRATION_SUMMARY.md` (NEW)

**Content**:

```markdown
# Sequence-Based LSTM Inference Migration

## Date: [Date]

## Changes Made

- Restored 32-frame buffering for LSTM inference
- Added `predict_sequence()` methods to ONNXPredictor
- Modified Consumer to wait for buffer full before inference
- Updated tests for sequence-based behavior

## Breaking Changes

- Initial prediction delay: ~1-2 seconds (32 frames @ 30fps)
- No predictions during first 31 frames after reset

## Performance Impact

- Latency: Increased by ~1-2s on cold start
- Accuracy: Improved due to LSTM temporal context
- Memory: Increased by ~200KB (32 frames buffer)

## Rollback Plan

[Git commit to revert to if needed]
```

**Checklist**:

- [ ] Create migration summary document
- [ ] Update all affected documentation
- [ ] Add inline code comments

---

### **PHASE 7: Deployment & Monitoring** 🚀

**Duration**: 1 hour  
**Risk**: Medium

#### **Task 7.1: Staged Rollout**

1. **Local Testing**:
   - [ ] Run full test suite
   - [ ] Manual testing with WebSocket client
   - [ ] Performance profiling

2. **Development Environment**:
   - [ ] Deploy to dev server
   - [ ] Test with frontend integration
   - [ ] Monitor for 24 hours

3. **Production**:
   - [ ] Deploy to production
   - [ ] Monitor error rates
   - [ ] Monitor latency metrics

**Checklist**:

- [ ] All tests passing
- [ ] No errors in logs
- [ ] Acceptable latency
- [ ] Frontend integration working

#### **Task 7.2: Monitoring**

**Metrics to track**:

- [ ] Average inference latency
- [ ] Buffer fill rate
- [ ] Dropped frame rate
- [ ] Error rate
- [ ] Memory usage

---

## **📅 IMPLEMENTATION TIMELINE**

| Phase                          | Duration | Dependencies | Start           | End             |
| ------------------------------ | -------- | ------------ | --------------- | --------------- |
| **Phase 1**: Pre-Flight        | 30 min   | None         | Day 1, 9:00 AM  | Day 1, 9:30 AM  |
| **Phase 2**: ONNX Predictor    | 2 hours  | Phase 1      | Day 1, 9:30 AM  | Day 1, 11:30 AM |
| **Phase 3**: Consumer Pipeline | 2 hours  | Phase 2      | Day 1, 1:00 PM  | Day 1, 3:00 PM  |
| **Phase 4**: Configuration     | 30 min   | Phase 3      | Day 1, 3:00 PM  | Day 1, 3:30 PM  |
| **Phase 5**: Testing           | 2 hours  | Phase 4      | Day 1, 3:30 PM  | Day 1, 5:30 PM  |
| **Phase 6**: Documentation     | 1 hour   | Phase 5      | Day 2, 9:00 AM  | Day 2, 10:00 AM |
| **Phase 7**: Deployment        | 1 hour   | Phase 6      | Day 2, 10:00 AM | Day 2, 11:00 AM |

**Total Estimated Time**: 9 hours (1.5 days)

---

## **⚠️ RISKS & MITIGATION**

| Risk                                | Probability | Impact | Mitigation                             |
| ----------------------------------- | ----------- | ------ | -------------------------------------- |
| Model expects different input shape | Medium      | High   | Verify in Phase 1 before coding        |
| UX degradation (1-2s delay)         | High        | Medium | Clear user feedback during buffer fill |
| Increased memory usage              | Low         | Low    | Monitor in Phase 7                     |
| Test failures                       | Medium      | Medium | Comprehensive testing in Phase 5       |
| Frontend breaking changes           | Low         | High   | Coordinate with frontend team          |

---

## **✅ SUCCESS CRITERIA**

- [ ] ONNX model accepts `[1, 32, 21, 3]` input
- [ ] Consumer waits for 32 frames before first prediction
- [ ] Buffer resets correctly on `new_letter`
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing shows correct behavior
- [ ] Latency is acceptable (~1-2s initial, real-time after)
- [ ] No memory leaks
- [ ] Documentation updated
- [ ] Frontend integration working

---

## **🔄 ROLLBACK PLAN**

If critical issues arise:

1. **Immediate Rollback** (< 5 minutes):

   ```bash
   git revert [commit-hash]
   git push
   ```

2. **Files to Revert**:
   - `back/services/onnx_predictor.py`
   - `back/app/consumer.py`
   - `back/config.py`

3. **Verification**:
   - [ ] Server starts without errors
   - [ ] Per-frame inference working
   - [ ] Tests passing

---

## **📋 TODO CHECKLIST** (Copy to GitHub Issues)

### **Before Starting**

- [ ] Answer Q1-Q5 clarification questions
- [ ] Review this plan with team
- [ ] Create feature branch: `feature/restore-lstm-sequence-inference`
- [ ] Back up current working code

### **Phase 1: Pre-Flight**

- [ ] Task 1.1: Verify ONNX model input shape
- [ ] Task 1.2: Review historical implementation
- [ ] Task 1.3: Document decisions

### **Phase 2: ONNX Predictor**

- [ ] Task 2.1: Implement `predict_sequence()`
- [ ] Task 2.2: Implement `predict_sequence_distribution()`
- [ ] Task 2.3: Update existing methods (if needed)

### **Phase 3: Consumer Pipeline**

- [ ] Task 3.1: Restore buffer-wait logic
- [ ] Task 3.2: Update distribution prediction
- [ ] Task 3.3: Update logging and metrics

### **Phase 4: Configuration**

- [ ] Task 4.1: Add sequence configuration
- [ ] Task 4.2: Update smoothing window

### **Phase 5: Testing**

- [ ] Task 5.1: Write unit tests
- [ ] Task 5.2: Update integration tests
- [ ] Task 5.3: Manual testing

### **Phase 6: Documentation**

- [ ] Task 6.1: Update ONNX migration summary
- [ ] Task 6.2: Update architecture docs
- [ ] Task 6.3: Update quickstart guide
- [ ] Task 6.4: Create migration summary

### **Phase 7: Deployment**

- [ ] Task 7.1: Staged rollout
- [ ] Task 7.2: Monitoring setup

---

## **🎯 NEXT STEPS**

1. **Answer the 5 clarification questions above**
2. **Verify ONNX model input shape** (most critical!)
3. **Review this plan** and approve/modify
4. **Create feature branch**
5. **Begin Phase 1**

---

**Ready to proceed? Please answer Q1-Q5 and confirm approval to start implementation.**

---
