# Backend Documentation

This backend-only workspace implements the machine-learning pipeline for real-time ASL recognition. Each directory and script follows the preprocessing → training → export stages described in the project goals.

## Setup & prerequisites

- Use Python 3.11+ (see `pyproject.toml`). From the repo root run:
  ```bash
  python3 -m venv back/venv
  source back/venv/bin/activate
  ```
- Install the ecosystem packages:
  ```bash
  pip install -r requirements.txt
  pip install yt-dlp ffmpeg-python opencv-python mediapipe torch torchvision torchaudio onnx onnx-tf tensorflow
  ```
- Ensure `ffmpeg` and `yt-dlp` are on `PATH` so the downloader and trimmer can shell out.
- When using the RTX 4000 Ada, match CUDA/cuDNN versions to the Torch wheel you install (`pip install torch --index-url https://download.pytorch.org/whl/cu121`).

## Directory layout

- `data/raw/` — downloaded YouTube videos for each clip.  
- `data/processed/` — trimmed clips, landmarks, manifests, and NPZ datasets consumed by models.  
- `src/data/` — helpers for metadata intake, downloading, trimming, landmark extraction, and dataset builds.  
- `src/models/` — architecture definitions (`mlp.py`, `lstm.py`, `tcn.py`).  
- `src/train/` — training (`train_model.py`) and evaluation (`eval_model.py`) scripts with dataloaders/schedulers.  
- `src/export/` — conversion scripts for ONNX and TFLite export.  
- `models/checkpoints/` — saved PyTorch checkpoints.  
- `models/exported/` — `classifier.tflite` and `classifier.onnx`.  
- `notebooks/` — exploratory analysis, visualization, and eval notebooks.

## Metadata intake

Use `metadata_intake.py` to normalize the provided MS-ASL/WLASL JSON and write a manifest for downstream processing.

```bash
python metadata_intake.py /path/to/msasl.json \
  --output backend/data/processed/manifest.json \
  --max-classes 80 \
  --clips-per-class 40
```

The script samples a balanced subset per class, skips incomplete entries, retains extra fields in `metadata`, and logs the manifest location.

## Pipeline A: MS-ASL Video Dataset (Words/Phrases)

1. **Download**: ingest the manifest with `src/data/download_msasl.py`, storing clips in `data/raw/` and emitting `backend/data/processed/manifest_downloaded.json`.  
2. **Trim**: cut downloads to labeled timestamps using `src/data/trim_clips.py`, saving result in `data/processed/clips/` and `manifest_trimmed.json`.  
3. **Extract landmarks**: run MediaPipe Hands (`src/data/extract_landmarks.py`) on each trimmed clip, normalize wrist-centered coordinates, pad/truncate to `T`, and store `[T, 21, 3]` tensors plus masks under `data/processed/landmarks/`. Logs help debug detection failures.  
4. **Build dataset**: `src/data/build_dataset.py` reads the landmark manifest and emits train/val/test `.npz` bundles with sequences, masks, labels, and clip metadata.

## Pipeline B: Kaggle ASL Alphabet (Static Letters)

This pipeline processes **static images** (one frame per letter) for letter classification, bypassing video download/trim stages:

1. **Download dataset**: manually download the [Kaggle ASL Alphabet dataset](https://www.kaggle.com/datasets/grassknoted/asl-alphabet) and extract to `/Users/an/daHacks/trainingData/archive/asl_alphabet_train/asl_alphabet_train/` (organized as `A/`, `B/`, ..., `Z/`, `space`, `del`, `nothing`).

2. **Extract landmarks**: run `src/data/prepare_kaggle_alphabet.py` to process each image with MediaPipe Hands, normalize landmarks, and write `.npy` files:
   ```bash
   python3 src/data/prepare_kaggle_alphabet.py
   ```
   (Uses default path `/Users/an/daHacks/trainingData/archive/asl_alphabet_train/asl_alphabet_train/`)
   
   This creates `backend/data/processed/kaggle_alphabet/landmarks/<label>/<image>.npy` files.

3. **Build dataset**: use `build_dataset.py` with `--static` flag to create train/val/test splits:
   ```bash
   python3 src/data/build_dataset.py backend/data/processed/kaggle_alphabet/manifest_kaggle_alphabet.json \
     --static \
     --prefix kaggle_alphabet_ \
     --dataset-dir backend/data/processed/datasets \
     --splits 0.7 0.15 0.15
   ```
   Outputs: `kaggle_alphabet_train.npz`, `kaggle_alphabet_val.npz`, `kaggle_alphabet_test.npz`.

4. **Train on letters**: use the MLP model (best for static gestures):
   ```bash
   python3 src/train/train_model.py \
     --dataset backend/data/processed/datasets/kaggle_alphabet_train.npz \
     --architecture mlp \
     --epochs 50 \
     --batch-size 64
   ```

**Key differences**: Kaggle pipeline skips video processing, uses `--static` mode in dataset builder, and stores single-frame landmarks `[1, 21, 3]` instead of sequences.

## Model training framework

- **Dataloaders** share the `.npz` schema; training scripts yield `(sequence, mask, label)` tuples and support PyTorch `Dataset` abstractions for MLP, LSTM, and TCN backbones.
- `src/models/mlp.py` flattens temporal data for static gesture recognition; `src/models/lstm.py` introduces recurrent depth, and `src/models/tcn.py` stacks dilated causal convolutions for speed.
- `src/train/train_model.py` loads the train split, configures hyperparameters (batch size, LR, dropout), checkpoints the best accuracy, and logs training/validation stats.
- `src/train/eval_model.py` loads a checkpoint + dataset split, reports accuracy/confusion matrices, and surfaces per-class failure modes.

## Export flow

1. Use `src/export/export_onnx.py` to convert the checkpoint into ONNX (`backend/models/exported/classifier.onnx`). The script reuses sequence metadata saved in the checkpoint so you get consistent input shapes.
2. Run `src/export/export_tflite.py` against the ONNX artifact to produce `backend/models/exported/classifier.tflite`. Optional quantization makes the model lighter for mobile CPUs.

## Compute & storage guidance

- Expect ~30–50 GB per 1,000 raw clips (pre-trim) and <1 GB for the processed dataset (`.npz`).  
- RTX 4000 Ada (or similar) accelerates MediaPipe + PyTorch training significantly; CPU-only jobs will be 3×–5× slower but still doable for prototyping.  
- Training lightweight models (5–10k sequences, 50 signs) on a mid-tier GPU takes ~1–2 hours per architecture; CPU training is longer.

## Use case scenarios

### Scenario 1: Train letter classifier (Kaggle Alphabet)
1. Download Kaggle ASL Alphabet dataset and extract to `backend/data/kaggle_alphabet/asl_alphabet_train/`
2. Run `prepare_kaggle_alphabet.py` to extract landmarks from static images
3. Build datasets with `build_dataset.py --static --prefix kaggle_alphabet_`
4. Train MLP model: `python src/train/train_model.py --dataset backend/data/processed/datasets/kaggle_alphabet_train.npz --architecture mlp --epochs 50`
5. Evaluate and export for mobile deployment

### Scenario 2: Train word/phrase classifier (MS-ASL)
1. Run `metadata_intake.py` to normalize MS-ASL JSON and sample classes
2. Download clips with `download_msasl.py` (handles unavailable/private videos gracefully)
3. Trim clips to labeled timestamps with `trim_clips.py`
4. Extract temporal landmarks with `extract_landmarks.py` (pads/truncates to fixed sequence length)
5. Build datasets with `build_dataset.py` (without `--static` flag)
6. Train LSTM or TCN model: `python src/train/train_model.py --dataset backend/data/processed/datasets/train.npz --architecture tcn`
7. Evaluate and export

### Scenario 3: Parallel development
- Run Kaggle alphabet pipeline (fast, static images) to get a working letter classifier while MS-ASL videos download/process in the background
- Both pipelines share the same training/eval/export scripts—only the dataset preparation differs
- Models trained on letters (MLP) vs. words (LSTM/TCN) can be deployed side-by-side for hierarchical recognition

## Functions & command reference

### MS-ASL Video Pipeline
- `python metadata_intake.py <metadata.json>` — normalize labels, sample subset, emit `backend/data/processed/manifest.json`. Flags: `--output`, `--max-classes`, `--clips-per-class`, `--seed`, `--verbose`.
- `python src/data/download_msasl.py backend/data/processed/manifest.json` — download clips into `backend/data/raw/`, produces `backend/data/processed/manifest_downloaded.json`. Flags: `--concurrency`, `--format`, `--resume`, `--overwrite`, `--dry-run`, `--sample`, `--output-manifest`, `--download-root`.
- `python src/data/trim_clips.py backend/data/processed/manifest_downloaded.json` — trim clips into `backend/data/processed/clips/`, emits `backend/data/processed/manifest_trimmed.json`. Flags: `--trim-root`, `--raw-root`, `--resume`, `--overwrite`, `--dry-run`, `--sample`, `--output-manifest`.
- `python src/data/extract_landmarks.py backend/data/processed/manifest_trimmed.json` — run MediaPipe Hands per clip, normalize/pad sequences, write `backend/data/processed/landmarks/` artifacts and metadata. Flags: `--sequence-length`, `--frame-skip`, `--resume`, `--dry-run`.

### Kaggle Alphabet Static Pipeline
- `python src/data/prepare_kaggle_alphabet.py <input_dir>` — extract landmarks from static images, write `.npy` files and manifest. Flags: `--output-root`, `--output-manifest`, `--min-detection-confidence`, `--resume`, `--dry-run`, `--verbose`.

### Dataset Building (Both Pipelines)
- `python src/data/build_dataset.py <manifest.json>` — build train/val/test `.npz` dataset files. For video sequences use default; for static images add `--static --prefix kaggle_alphabet_`. Flags: `--dataset-dir`, `--splits`, `--seed`, `--max-samples`, `--static`, `--prefix`, `--verbose`.

### Training & Evaluation (Both Pipelines)
- `python src/train/train_model.py --dataset <dataset.npz>` — train MLP/LSTM/TCN models, save checkpoints to `backend/models/checkpoints/`. Flags: `--architecture`, `--hidden-dim`, `--dropout`, `--batch-size`, `--epochs`, `--lr`, `--device`, `--tensorboard`.
- `python src/train/eval_model.py --dataset <test.npz> --checkpoint <checkpoint.pt>` — report accuracy/confusion matrix. Flags: `--architecture`, `--hidden-dim`, `--dropout`, `--device`.
- `tensorboard --logdir backend/models/checkpoints/runs` — visualize training metrics (loss, accuracy) in real-time at http://localhost:6006.

### Export (Both Pipelines)
- `python src/export/export_onnx.py --checkpoint <checkpoint.pt>` — export ONNX with metadata-aware shapes. Flags: `--architecture`, `--sequence-length`, `--feature-dim`, `--hidden-dim`.
- `python src/export/export_tflite.py --onnx backend/models/exported/classifier.onnx` — convert ONNX to TFLite for mobile deployment. Flags: `--quantize`.

## Inference API

### Quick Start
```python
from src.inference import ASLPredictor
import torch

# Load trained model
predictor = ASLPredictor('backend/models/checkpoints/mlp_epoch10_acc0.950.pt')

# Input: PyTorch tensor [1, 1, 21, 3] for static images
# or [1, T, 21, 3] for video sequences
landmarks = torch.randn(1, 1, 21, 3)

# Get full softmax distribution for all classes
distribution = predictor.predict_distribution(landmarks)
# Returns: [
#   {'letter': 'A', 'confidence': 0.85},
#   {'letter': 'B', 'confidence': 0.03},
#   ...
# ]
```

### ASLPredictor Methods

**`predict_distribution(landmarks, mask=None, sort_by_confidence=True)`**
- Returns full softmax distribution for all classes
- Input: `torch.Tensor [batch_size, sequence_length, 21, 3]`
- Output: List of dicts with `'letter'` and `'confidence'` keys
- Sorted by confidence (highest first) if `sort_by_confidence=True`

**`predict_top_k(landmarks, mask=None, k=5)`**
- Returns top-k most likely predictions
- Useful for showing alternatives to the user

**`predict_single(landmarks, mask=None)`**
- Returns only the most likely prediction
- Output: `{'letter': 'A', 'confidence': 0.85}`

**`predict_batch(landmarks_batch, masks_batch=None)`**
- Process multiple inputs in parallel
- Input: `[batch_size, sequence_length, 21, 3]`
- Output: List of distributions (one per batch item)

**`get_label_map()`**
- Returns the label-to-index mapping used during training

**`get_model_info()`**
- Returns model metadata (architecture, num_classes, device, etc.)

### Complete Example
See `examples/inference_example.py` for:
- Single image prediction with full distribution
- Top-k predictions
- Real-time webcam processing
- Batch processing multiple images
- MediaPipe landmark extraction integration

### Integration with MediaPipe
```python
import cv2
import mediapipe as mp
import numpy as np
import torch

def extract_landmarks(image_path):
    """Extract landmarks from image for inference."""
    mp_hands = mp.solutions.hands
    with mp_hands.Hands(static_image_mode=True, max_num_hands=1) as hands:
        image = cv2.imread(image_path)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)
        
        if not results.multi_hand_landmarks:
            return None
        
        # Extract 21x3 coordinates
        landmarks = np.array([
            [lm.x, lm.y, lm.z] 
            for lm in results.multi_hand_landmarks[0].landmark
        ], dtype=np.float32)
        
        # Normalize (wrist-centered, scaled)
        origin = landmarks[0]
        rel = landmarks - origin
        scale = np.linalg.norm(rel[9]) or 1.0
        normalized = rel / scale
        
        # Convert to tensor [1, 1, 21, 3]
        return torch.from_numpy(normalized).unsqueeze(0).unsqueeze(0)

# Use with predictor
predictor = ASLPredictor('backend/models/checkpoints/best_mlp.pt')
landmarks = extract_landmarks('test_image.jpg')
if landmarks is not None:
    distribution = predictor.predict_distribution(landmarks)
    print(f"Top prediction: {distribution[0]}")
```

## Next steps

1. Run `metadata_intake.py` to produce `backend/data/processed/manifest.json`.  
2. Download and trim the clips; then extract landmarks into `backend/data/processed/landmarks/`.  
3. Build train/val/test `.npz` datasets with `build_dataset.py`.  
4. Train the desired architecture using `train_model.py` and evaluate with `eval_model.py`.  
5. Export the strongest checkpoint to ONNX/TFLite for deployment via `export_*` scripts.

