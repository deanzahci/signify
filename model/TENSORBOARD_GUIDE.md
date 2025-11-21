# TensorBoard Visualization Guide

## What is TensorBoard?

TensorBoard is a visualization toolkit that provides real-time graphs of your training metrics:
- **Training loss** over epochs
- **Training accuracy** over epochs  
- **Validation accuracy** over epochs
- **Learning rate** schedule
- Compare multiple training runs side-by-side

---

## Setup

### 1. Install TensorBoard (if not already installed)
```bash
pip install tensorboard
```

TensorBoard comes with PyTorch, so you likely already have it!

---

## Usage

### Step 1: Train with TensorBoard Logging

Add the `--tensorboard` flag when training:

```bash
python3 back/src/train/train_model.py \
  --dataset backend/data/processed/datasets/kaggle_alphabet_train.npz \
  --architecture mlp \
  --epochs 50 \
  --batch-size 64 \
  --tensorboard
```

**What happens:**
- Logs are saved to `backend/models/checkpoints/runs/<architecture>_<dataset>/`
- Metrics are written after each epoch
- You'll see a message: `TensorBoard logging enabled. Run: tensorboard --logdir ...`

---

### Step 2: Start TensorBoard Server

**Option A: In a separate terminal** (recommended)

```bash
# Terminal 1: Training (keep running)
python3 back/src/train/train_model.py --dataset ... --tensorboard

# Terminal 2: TensorBoard server
tensorboard --logdir backend/models/checkpoints/runs
```

**Option B: Background process**

```bash
# Start TensorBoard in background
tensorboard --logdir backend/models/checkpoints/runs &

# Start training
python3 back/src/train/train_model.py --dataset ... --tensorboard
```

---

### Step 3: View Graphs in Browser

Open your browser and go to:
```
http://localhost:6006
```

You'll see:
- **Scalars tab**: Line graphs of loss/accuracy
- **Graphs tab**: Model architecture visualization
- **Distributions tab**: Weight/gradient distributions

---

## What You'll See

### Training Loss Graph
```
Loss/train
│
3.0 ┤╮
2.5 ┤ ╰╮
2.0 ┤   ╰╮
1.5 ┤     ╰╮
1.0 ┤       ╰╮
0.5 ┤         ╰╮
0.0 ┤           ╰─────────
    └────────────────────────> Epochs
    0   10   20   30   40   50
```

### Accuracy Graphs
```
Accuracy/train (blue) vs Accuracy/val (orange)

1.0 ┤           ╭─────────
0.9 ┤         ╭─╯
0.8 ┤       ╭─╯
0.7 ┤     ╭─╯
0.6 ┤   ╭─╯
0.5 ┤ ╭─╯
0.0 ┤─╯
    └────────────────────────> Epochs
```

---

## Features

### 1. Real-Time Updates
Graphs update automatically as training progresses—no need to refresh!

### 2. Compare Multiple Runs
Train multiple models and compare them:

```bash
# Run 1: MLP with hidden_dim=128
python3 back/src/train/train_model.py \
  --dataset kaggle_alphabet_train.npz \
  --architecture mlp \
  --hidden-dim 128 \
  --tensorboard

# Run 2: MLP with hidden_dim=256
python3 back/src/train/train_model.py \
  --dataset kaggle_alphabet_train.npz \
  --architecture mlp \
  --hidden-dim 256 \
  --tensorboard

# Run 3: LSTM
python3 back/src/train/train_model.py \
  --dataset kaggle_alphabet_train.npz \
  --architecture lstm \
  --tensorboard
```

All three runs will appear in TensorBoard for side-by-side comparison!

### 3. Zoom & Pan
- Click and drag to zoom into specific epochs
- Scroll to zoom in/out
- Double-click to reset view

### 4. Download Data
- Click "Show data download links" to export CSV
- Use for creating publication-ready plots

---

## Metrics Logged

| Metric | Description |
|--------|-------------|
| `Loss/train` | Training loss (CrossEntropyLoss) |
| `Accuracy/train` | Training accuracy (%) |
| `Accuracy/val` | Validation accuracy (%) |
| `Learning_Rate` | Current learning rate (tracks scheduler) |

---

## Example Training Session

### Terminal 1: Training
```bash
$ python3 back/src/train/train_model.py \
    --dataset backend/data/processed/datasets/kaggle_alphabet_train.npz \
    --architecture mlp \
    --epochs 50 \
    --batch-size 64 \
    --tensorboard

2025-11-21 16:00:00,000 INFO TensorBoard logging enabled. Run: tensorboard --logdir backend/models/checkpoints/runs
2025-11-21 16:00:01,000 INFO Epoch 1: loss=3.2145 train_acc=0.234 val_acc=0.245
2025-11-21 16:00:05,000 INFO Epoch 2: loss=2.1234 train_acc=0.456 val_acc=0.467
...
```

### Terminal 2: TensorBoard
```bash
$ tensorboard --logdir backend/models/checkpoints/runs

TensorBoard 2.15.0 at http://localhost:6006/ (Press CTRL+C to quit)
```

### Browser: http://localhost:6006
You'll see graphs updating in real-time as training progresses!

---

## Tips & Tricks

### 1. Monitor Overfitting
Watch for divergence between train and val accuracy:
- **Good**: Train and val accuracy increase together
- **Overfitting**: Train accuracy high, val accuracy plateaus/drops

### 2. Detect Training Issues
- **Loss not decreasing**: Learning rate too low or model too small
- **Loss exploding**: Learning rate too high
- **Accuracy stuck**: Model capacity issue or data problem

### 3. Save Runs for Later
TensorBoard logs persist after training ends. You can view them anytime:

```bash
# View old runs
tensorboard --logdir backend/models/checkpoints/runs
```

### 4. Clean Up Old Runs
```bash
# Remove old logs
rm -rf backend/models/checkpoints/runs/*
```

---

## Troubleshooting

### "TensorBoard not found"
```bash
pip install tensorboard
```

### "Port 6006 already in use"
```bash
# Use a different port
tensorboard --logdir backend/models/checkpoints/runs --port 6007
```

Then open: http://localhost:6007

### "No dashboards are active"
- Make sure you trained with `--tensorboard` flag
- Check that logs exist: `ls backend/models/checkpoints/runs/`
- Wait a few seconds for TensorBoard to detect new files

### Graphs not updating
- Refresh the browser
- Check that training is still running
- Click the refresh icon in TensorBoard UI (top right)

---

## Advanced: Custom Metrics

Want to log more metrics? Edit `train_model.py` and add:

```python
if writer is not None:
    writer.add_scalar("Loss/validation", val_loss, epoch)
    writer.add_scalar("Metrics/precision", precision, epoch)
    writer.add_scalar("Metrics/recall", recall, epoch)
```

---

## Summary

**Before TensorBoard:**
```
Epoch 1: loss=3.21 train_acc=0.23 val_acc=0.24
Epoch 2: loss=2.12 train_acc=0.45 val_acc=0.46
...
```
Hard to see trends, no visualization.

**With TensorBoard:**
- 📊 Real-time graphs
- 🔍 Zoom into specific epochs
- 📈 Compare multiple runs
- 💾 Export data for papers
- 🎯 Catch overfitting early

**Just add `--tensorboard` to your training command!**

