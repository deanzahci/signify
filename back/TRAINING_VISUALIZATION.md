# Training Visualization Summary

## ✅ TensorBoard Now Enabled!

I've added real-time training visualization to your pipeline. Here's what you get:

---

## Quick Start

### 1. Train with Visualization
```bash
python3 back/src/train/train_model.py \
  --dataset backend/data/processed/datasets/kaggle_alphabet_train.npz \
  --architecture mlp \
  --epochs 50 \
  --batch-size 64 \
  --tensorboard  # ← Add this flag!
```

### 2. View Graphs (in separate terminal)
```bash
tensorboard --logdir backend/models/checkpoints/runs
```

### 3. Open Browser
Go to: **http://localhost:6006**

---

## What You'll See

### 📉 Training Loss
Watch loss decrease over time:
- Should drop from ~3.0 to <0.1
- Smooth curve = good training
- Spiky/erratic = learning rate too high

### 📈 Training Accuracy
Track how well model learns training data:
- Should increase from ~20% to ~98%
- Plateaus indicate convergence

### 📊 Validation Accuracy
**Most important metric!** Shows generalization:
- Should track training accuracy closely
- If it diverges → overfitting
- Final value = model performance

### 🎯 Learning Rate
Shows how learning rate decreases:
- Starts at 0.001
- Drops every 5 epochs (scheduler)
- Helps fine-tune in later epochs

---

## Example Output

### Console (Terminal 1)
```
2025-11-21 16:00:00 INFO TensorBoard logging enabled. Run: tensorboard --logdir backend/models/checkpoints/runs
2025-11-21 16:00:01 INFO Epoch 1: loss=3.2145 train_acc=0.234 val_acc=0.245
2025-11-21 16:00:05 INFO Epoch 2: loss=2.1234 train_acc=0.456 val_acc=0.467
2025-11-21 16:00:10 INFO Epoch 3: loss=1.5678 train_acc=0.623 val_acc=0.634
...
2025-11-21 16:25:00 INFO Epoch 50: loss=0.0234 train_acc=0.989 val_acc=0.952
2025-11-21 16:25:00 INFO Training finished. Best accuracy 0.952
```

### TensorBoard (Browser)
```
http://localhost:6006

┌─────────────────────────────────────────┐
│  SCALARS                                │
├─────────────────────────────────────────┤
│                                         │
│  Loss/train                             │
│  3.0 ┤╮                                 │
│  2.0 ┤ ╰╮                               │
│  1.0 ┤   ╰╮                             │
│  0.0 ┤     ╰─────────                   │
│      └──────────────────> Epochs        │
│                                         │
│  Accuracy/train vs Accuracy/val         │
│  1.0 ┤           ╭─────────             │
│  0.8 ┤       ╭─╯                        │
│  0.6 ┤   ╭─╯                            │
│  0.4 ┤ ╭─╯                              │
│      └──────────────────> Epochs        │
│                                         │
└─────────────────────────────────────────┘
```

---

## Metrics Tracked

| Metric | What It Shows | Good Value |
|--------|---------------|------------|
| **Loss/train** | How wrong predictions are | <0.1 after 50 epochs |
| **Accuracy/train** | % correct on training data | >95% |
| **Accuracy/val** | % correct on validation data | >92% (close to train) |
| **Learning_Rate** | Current learning rate | Decreases over time |

---

## Interpreting Results

### ✅ Good Training
```
Train Acc: ████████████████████ 98%
Val Acc:   ███████████████████  95%
```
- Train and val accuracy close together
- Both high (>90%)
- Loss decreasing smoothly

### ⚠️ Overfitting
```
Train Acc: ████████████████████ 99%
Val Acc:   ████████████         75%
```
- Train accuracy much higher than val
- Gap widens over epochs
- **Solution**: Add more dropout, reduce epochs

### ⚠️ Underfitting
```
Train Acc: ████████             50%
Val Acc:   ███████              48%
```
- Both accuracies low
- Not learning enough
- **Solution**: Increase model size, train longer

---

## Compare Multiple Runs

Train different configurations and compare:

```bash
# Run 1: Small model
python3 back/src/train/train_model.py \
  --dataset kaggle_alphabet_train.npz \
  --hidden-dim 128 \
  --tensorboard

# Run 2: Large model
python3 back/src/train/train_model.py \
  --dataset kaggle_alphabet_train.npz \
  --hidden-dim 512 \
  --tensorboard
```

TensorBoard shows both runs on same graph—easy to see which performs better!

---

## Files Created

```
backend/models/checkpoints/runs/
├── mlp_kaggle_alphabet_train/
│   └── events.out.tfevents.1234567890.hostname
├── lstm_kaggle_alphabet_train/
│   └── events.out.tfevents.1234567891.hostname
└── tcn_kaggle_alphabet_train/
    └── events.out.tfevents.1234567892.hostname
```

Each training run gets its own folder with event logs.

---

## Summary

**Before:**
- ❌ No visualization
- ❌ Hard to debug training
- ❌ Can't compare runs easily

**After (with TensorBoard):**
- ✅ Real-time graphs
- ✅ Spot overfitting immediately
- ✅ Compare multiple experiments
- ✅ Professional ML workflow

**Just add `--tensorboard` when training!**

---

## Next Steps

1. **Train your model** with `--tensorboard` flag
2. **Start TensorBoard** in separate terminal
3. **Watch graphs** update in real-time
4. **Adjust hyperparameters** based on what you see
5. **Compare runs** to find best configuration

See `TENSORBOARD_GUIDE.md` for detailed usage instructions.

