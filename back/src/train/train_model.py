"""
Training script for MLP/LSTM/TCN classifiers using prebuilt NPZ datasets.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Tuple

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.train.utils import LandmarkDataset, build_model

DEFAULT_CHECKPOINT_DIR = Path("backend/models/checkpoints")


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


class LandmarkDataset(Dataset):
    def __init__(self, path: Path):
        data = np.load(path, allow_pickle=True)
        self.sequences = torch.from_numpy(data["sequences"]).float()
        self.labels = torch.from_numpy(data["labels"]).long()
        metadata_raw = data.get("metadata")
        if metadata_raw is not None:
            self.metadata = json.loads(metadata_raw.item())
        else:
            self.metadata = {}

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return self.sequences[idx], self.labels[idx]


def build_model(
    architecture: str,
    sequence_length: int,
    feature_dim: int,
    num_classes: int,
    hidden_dim: int,
    dropout: float,
) -> nn.Module:
    if architecture == "mlp":
        return MLPClassifier(input_dim=sequence_length * feature_dim, hidden_dims=(hidden_dim, hidden_dim // 2), num_classes=num_classes, dropout=dropout)
    if architecture == "lstm":
        return LSTMClassifier(input_dim=feature_dim, hidden_dim=hidden_dim, num_layers=2, num_classes=num_classes, dropout=dropout, bidirectional=True)
    if architecture == "tcn":
        return TCNClassifier(input_dim=feature_dim, num_classes=num_classes, num_channels=(hidden_dim, hidden_dim), dropout=dropout)
    raise ValueError(f"Unknown architecture {architecture}")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a classifier from landmark datasets.")
    parser.add_argument("--dataset", type=Path, required=True, help="Path to the train dataset NPZ.")
    parser.add_argument("--architecture", choices=("mlp", "lstm", "tcn"), default="tcn", help="Model to train.")
    parser.add_argument("--hidden-dim", type=int, default=256, help="Hidden dimension for the model.")
    parser.add_argument("--dropout", type=float, default=0.2, help="Dropout probability.")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size.")
    parser.add_argument("--epochs", type=int, default=20, help="Number of epochs.")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate.")
    parser.add_argument("--checkpoint-dir", type=Path, default=DEFAULT_CHECKPOINT_DIR, help="Where to save checkpoints.")
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu", help="Training device.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args()


def train_epoch(model, dataloader, optimizer, criterion, device) -> Tuple[float, float]:
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0
    for sequences, labels in dataloader:
        sequences = sequences.to(device)
        labels = labels.to(device)
        optimizer.zero_grad()
        logits = model(sequences)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * labels.size(0)
        _, preds = logits.max(1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)
    return total_loss / total, correct / total


def evaluate(model, dataloader, device):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for sequences, labels in dataloader:
            sequences = sequences.to(device)
            labels = labels.to(device)
            logits = model(sequences)
            _, preds = logits.max(1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
    return correct / total


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)
    torch.manual_seed(args.seed)

    dataset = LandmarkDataset(args.dataset)
    sequence_length = dataset.metadata.get("sequence_length", dataset.sequences.shape[1])
    feature_dim = dataset.sequences.shape[2]
    num_classes = int(dataset.labels.max().item() + 1)

    dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, num_workers=2, pin_memory=True)
    model = build_model(args.architecture, sequence_length, feature_dim, num_classes, args.hidden_dim, args.dropout).to(args.device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)

    args.checkpoint_dir.mkdir(parents=True, exist_ok=True)
    best_acc = 0.0
    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_epoch(model, dataloader, optimizer, criterion, args.device)
        val_acc = evaluate(model, dataloader, args.device)
        scheduler.step()
        logging.info("Epoch %d: loss=%.4f train_acc=%.3f val_acc=%.3f", epoch, train_loss, train_acc, val_acc)
        if val_acc > best_acc:
            best_acc = val_acc
            checkpoint_path = args.checkpoint_dir / f"{args.architecture}_epoch{epoch}_acc{val_acc:.3f}.pt"
            torch.save(
                {
                    "epoch": epoch,
                    "state_dict": model.state_dict(),
                    "architecture": args.architecture,
                    "sequence_length": sequence_length,
                    "feature_dim": feature_dim,
                    "num_classes": num_classes,
                },
                checkpoint_path,
            )
            logging.info("Saved checkpoint %s", checkpoint_path)

    logging.info("Training finished. Best accuracy %.3f", best_acc)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning("Interrupted.")
        sys.exit(1)

