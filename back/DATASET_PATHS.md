# Dataset Paths Reference

## Actual Directory Structure

### Kaggle ASL Alphabet Dataset
**Location**: `/Users/an/daHacks/trainingData/archive/`

```
/Users/an/daHacks/trainingData/archive/
├── asl_alphabet_train/
│   └── asl_alphabet_train/          # ← Actual training data (nested)
│       ├── A/
│       │   ├── A1.jpg
│       │   ├── A2.jpg
│       │   └── ... (~3000 images)
│       ├── B/
│       ├── C/
│       ├── D/
│       ├── E/
│       ├── F/
│       ├── G/
│       ├── H/
│       ├── I/
│       ├── J/
│       ├── K/
│       ├── L/
│       ├── M/
│       ├── N/
│       ├── O/
│       ├── P/
│       ├── Q/
│       ├── R/
│       ├── S/
│       ├── T/
│       ├── U/
│       ├── V/
│       ├── W/
│       ├── X/
│       ├── Y/
│       ├── Z/
│       ├── space/
│       ├── del/
│       └── nothing/
└── asl_alphabet_test/
    └── asl_alphabet_test/           # ← Actual test data (nested)
        ├── A_test.jpg
        ├── B_test.jpg
        ├── C_test.jpg
        └── ... (29 images total)
```

### MS-ASL Video Dataset
**Location**: `/Users/an/daHacks/trainingData/MS-ASL/`

```
/Users/an/daHacks/trainingData/MS-ASL/
├── MSASL_train.json
├── MSASL_test.json
├── MSASL_val.json
├── MSASL_classes.json
└── MSASL_synonym.json
```

### Processed Data (Output)
**Location**: `backend/data/processed/`

```
backend/data/processed/
├── kaggle_alphabet/                 # Kaggle landmarks output
│   ├── landmarks/
│   │   ├── A/
│   │   │   ├── A1.npy
│   │   │   ├── A2.npy
│   │   │   └── ...
│   │   ├── B/
│   │   └── ...
│   └── manifest_kaggle_alphabet.json
├── landmarks/                       # MS-ASL landmarks output
│   └── manifest.json
└── datasets/                        # Final .npz datasets
    ├── kaggle_alphabet_train.npz
    ├── kaggle_alphabet_val.npz
    ├── kaggle_alphabet_test.npz
    ├── train.npz                    # MS-ASL
    ├── val.npz
    └── test.npz
```

## Commands

### Process Kaggle Training Data
```bash
# Default path is now configured, just run:
python3 back/src/data/prepare_kaggle_alphabet.py

# Or explicitly specify:
python3 back/src/data/prepare_kaggle_alphabet.py \
  /Users/an/daHacks/trainingData/archive/asl_alphabet_train/asl_alphabet_train
```

### Process Kaggle Test Data
```bash
python3 back/src/data/prepare_kaggle_alphabet.py \
  /Users/an/daHacks/trainingData/archive/asl_alphabet_test/asl_alphabet_test \
  --output-manifest backend/data/processed/kaggle_alphabet/manifest_test.json
```

### Build Datasets
```bash
# Training dataset
python3 back/src/data/build_dataset.py \
  backend/data/processed/kaggle_alphabet/manifest_kaggle_alphabet.json \
  --static \
  --prefix kaggle_alphabet_ \
  --splits 0.7 0.15 0.15
```

### Train Model
```bash
python3 back/src/train/train_model.py \
  --dataset backend/data/processed/datasets/kaggle_alphabet_train.npz \
  --architecture mlp \
  --epochs 50 \
  --batch-size 64
```

## Notes

- **Training data**: ~87,000 images (29 classes × ~3000 images each)
- **Test data**: 29 images (1 per class)
- **Nested structure**: The Kaggle dataset has an extra nesting level (`asl_alphabet_train/asl_alphabet_train/`)
- **Default path**: Now points to `/Users/an/daHacks/trainingData/archive/asl_alphabet_train/asl_alphabet_train/`

