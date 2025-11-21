# ASL Inference API - Full Softmax Distribution

## Overview
This API provides exactly what you requested:
- **Input**: PyTorch Tensor (hand landmarks)
- **Output**: Letter detected + confidence score for **each alphabet**

## Quick Start (30 seconds)

```python
from src.inference import ASLPredictor
import torch

# 1. Load model (do this once at startup)
predictor = ASLPredictor('backend/models/checkpoints/best_mlp.pt')

# 2. Prepare input (PyTorch tensor with hand landmarks)
landmarks = torch.randn(1, 1, 21, 3)  # [batch, time, landmarks, coords]

# 3. Get full distribution for ALL letters
distribution = predictor.predict_distribution(landmarks)

# 4. Use the results
print(distribution[0])  # Top prediction
# Output: {'letter': 'A', 'confidence': 0.85}

# See all letters:
for pred in distribution:
    print(f"{pred['letter']}: {pred['confidence']:.4f}")
```

## Output Format

### Full Distribution (All Letters)
```python
[
    {'letter': 'A', 'confidence': 0.8523},
    {'letter': 'B', 'confidence': 0.0312},
    {'letter': 'C', 'confidence': 0.0245},
    {'letter': 'D', 'confidence': 0.0198},
    ...
    {'letter': 'Z', 'confidence': 0.0001},
    {'letter': 'space', 'confidence': 0.0089},
    {'letter': 'del', 'confidence': 0.0043},
    {'letter': 'nothing', 'confidence': 0.0156}
]
```

- **Sorted by confidence** (highest first) by default
- **All 29 classes** included (A-Z + space + del + nothing)
- **Confidences sum to 1.0** (proper probability distribution)

## API Methods

### `predict_distribution(landmarks, mask=None, sort_by_confidence=True)`
Returns full softmax distribution for all classes.

**Parameters:**
- `landmarks` (torch.Tensor): Shape `[batch_size, sequence_length, 21, 3]`
  - For static images: `[1, 1, 21, 3]`
  - For video sequences: `[1, T, 21, 3]`
- `mask` (torch.Tensor, optional): Mask for padded frames
- `sort_by_confidence` (bool): Sort by confidence (default: True)

**Returns:**
- List of dicts with `'letter'` and `'confidence'` keys

### `predict_top_k(landmarks, mask=None, k=5)`
Returns only top-k predictions (faster if you don't need all classes).

### `predict_single(landmarks, mask=None)`
Returns only the most likely prediction.

### `predict_batch(landmarks_batch, masks_batch=None)`
Process multiple inputs in parallel.

## Input Format: PyTorch Tensor

### Shape Requirements
```python
# Static image (single frame):
landmarks.shape == torch.Size([1, 1, 21, 3])
#                              │  │  │   └─ x, y, z coordinates
#                              │  │  └───── 21 hand landmarks
#                              │  └──────── 1 frame (static image)
#                              └─────────── batch size

# Video sequence:
landmarks.shape == torch.Size([1, T, 21, 3])
#                              │  │  │   └─ x, y, z coordinates
#                              │  │  └───── 21 hand landmarks
#                              │  └──────── T frames in sequence
#                              └─────────── batch size
```

### Landmark Ordering (MediaPipe Hands)
```
0: WRIST
1-4: THUMB (CMC, MCP, IP, TIP)
5-8: INDEX (MCP, PIP, DIP, TIP)
9-12: MIDDLE (MCP, PIP, DIP, TIP)
13-16: RING (MCP, PIP, DIP, TIP)
17-20: PINKY (MCP, PIP, DIP, TIP)
```

### Coordinate Normalization
Landmarks should be **normalized** before inference:
1. Translate to wrist origin (landmark 0)
2. Scale by hand size (distance from wrist to middle finger MCP)

See `examples/inference_example.py` for complete MediaPipe integration.

## Complete Integration Example

```python
import cv2
import mediapipe as mp
import numpy as np
import torch
from src.inference import ASLPredictor

# Initialize once
predictor = ASLPredictor('backend/models/checkpoints/best_mlp.pt')
mp_hands = mp.solutions.hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.5
)

def recognize_letter_from_image(image_path):
    """Complete pipeline: image -> landmarks -> prediction."""
    
    # 1. Read image
    image = cv2.imread(image_path)
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 2. Extract landmarks with MediaPipe
    results = mp_hands.process(rgb)
    if not results.multi_hand_landmarks:
        return None
    
    # 3. Convert to numpy array
    landmarks = np.array([
        [lm.x, lm.y, lm.z]
        for lm in results.multi_hand_landmarks[0].landmark
    ], dtype=np.float32)
    
    # 4. Normalize
    origin = landmarks[0]  # wrist
    rel = landmarks - origin
    scale = np.linalg.norm(rel[9]) or 1.0  # middle finger MCP
    normalized = rel / scale
    
    # 5. Convert to PyTorch tensor
    tensor = torch.from_numpy(normalized).unsqueeze(0).unsqueeze(0)
    
    # 6. Get predictions
    distribution = predictor.predict_distribution(tensor)
    
    return distribution

# Use it
distribution = recognize_letter_from_image('test.jpg')
if distribution:
    print(f"Top prediction: {distribution[0]['letter']} ({distribution[0]['confidence']:.2%})")
    print(f"\nAll predictions:")
    for pred in distribution[:5]:  # Show top 5
        print(f"  {pred['letter']}: {pred['confidence']:.4f}")
```

## Real-Time Video Processing

```python
import cv2
from src.inference import ASLPredictor

predictor = ASLPredictor('backend/models/checkpoints/best_mlp.pt')
cap = cv2.VideoCapture(0)

mp_hands = mp.solutions.hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break
    
    # Extract landmarks (same as above)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = mp_hands.process(rgb)
    
    if results.multi_hand_landmarks:
        # ... normalize and convert to tensor ...
        distribution = predictor.predict_top_k(landmarks, k=3)
        
        # Display on frame
        for i, pred in enumerate(distribution):
            text = f"{pred['letter']}: {pred['confidence']:.2f}"
            cv2.putText(frame, text, (10, 30 + i*30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    
    cv2.imshow('ASL Recognition', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

## Performance

### Inference Speed (RTX 4000 Ada)
- **MLP**: ~1-2ms per frame
- **LSTM**: ~5-10ms per frame
- **TCN**: ~3-5ms per frame

### Memory Usage
- Model size: ~5-20 MB (depending on architecture)
- Per-frame memory: <1 MB

### Batch Processing
Process multiple frames in parallel for better throughput:
```python
# Stack multiple landmark tensors
batch = torch.cat([landmarks1, landmarks2, landmarks3], dim=0)  # [3, 1, 21, 3]

# Predict batch
results = predictor.predict_batch(batch)
# Returns: [distribution1, distribution2, distribution3]
```

## Model Training

To train your own model:

```bash
# 1. Prepare Kaggle alphabet dataset
python src/data/prepare_kaggle_alphabet.py backend/data/kaggle_alphabet/asl_alphabet_train

# 2. Build dataset
python src/data/build_dataset.py backend/data/processed/kaggle_alphabet/manifest_kaggle_alphabet.json \
  --static --prefix kaggle_alphabet_

# 3. Train MLP model
python src/train/train_model.py \
  --dataset backend/data/processed/datasets/kaggle_alphabet_train.npz \
  --architecture mlp \
  --epochs 50 \
  --batch-size 64
```

Checkpoints are saved to `backend/models/checkpoints/` with format:
`mlp_epoch10_acc0.950.pt`

## Troubleshooting

### "Checkpoint not found"
Make sure you've trained a model first. See "Model Training" section above.

### "No hand detected"
- Ensure good lighting
- Hand should be clearly visible in frame
- Try adjusting `min_detection_confidence` (default: 0.5)

### "Wrong predictions"
- Verify landmarks are normalized correctly
- Check that input shape is `[1, 1, 21, 3]` for static images
- Ensure model was trained on similar data

### "Slow inference"
- Use MLP for static images (fastest)
- Enable GPU: `predictor = ASLPredictor(checkpoint, device='cuda')`
- Use `predict_top_k()` instead of `predict_distribution()` if you don't need all classes

## Examples

Run the provided examples:

```bash
# Quick start (simplest example)
python examples/quick_start_inference.py

# Complete examples (image, video, batch processing)
python examples/inference_example.py
```

## Questions?

See `backend_readme.md` for full documentation or check the inline docstrings in `src/inference/predictor.py`.

