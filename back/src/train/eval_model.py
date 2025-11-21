"""
Evaluate trained checkpoints against benchmark datasets.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.train.utils import LandmarkDataset, build_model


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate a checkpoint on a dataset.")
    parser.add_argument("--dataset", type=Path, required=True, help="Path to NPZ dataset (val/test).")
    parser.add_argument("--checkpoint", type=Path, required=True, help="Checkpoint to evaluate.")
    parser.add_argument("--architecture", choices=("mlp", "lstm", "tcn"), default="tcn", help="Model architecture.")
    parser.add_argument("--hidden-dim", type=int, default=256, help="Hidden dim for the model.")
    parser.add_argument("--dropout", type=float, default=0.2, help="Dropout probability.")
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu", help="Device to run on.")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args()


def load_checkpoint(model: nn.Module, path: Path, device: str) -> None:
    state = torch.load(path, map_location=device)
    model.load_state_dict(state["state_dict"])


def evaluate(model: nn.Module, loader: DataLoader, device: str, num_classes: int) -> tuple[float, torch.Tensor]:
    model.eval()
    correct = 0
    total = 0
    confusion = torch.zeros(num_classes, num_classes, dtype=torch.int64)
    with torch.no_grad():
        for sequences, labels in loader:
            sequences = sequences.to(device)
            labels = labels.to(device)
            logits = model(sequences)
            _, preds = logits.max(1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            for t, p in zip(labels.view(-1), preds.view(-1)):
                confusion[t.long(), p.long()] += 1
    accuracy = correct / total if total else 0.0
    return accuracy, confusion


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)
    dataset = LandmarkDataset(args.dataset)
    sequence_length = dataset.metadata.get("sequence_length", dataset.sequences.shape[1])
    feature_dim = dataset.sequences.shape[2]
    num_classes = int(dataset.labels.max().item() + 1)
    model = build_model(
        args.architecture,
        sequence_length,
        feature_dim,
        num_classes,
        args.hidden_dim,
        args.dropout,
    ).to(args.device)
    load_checkpoint(model, args.checkpoint, args.device)
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)
    accuracy, confusion = evaluate(model, loader, args.device, num_classes)
    logging.info("Evaluation accuracy: %.3f", accuracy)
    logging.info("Confusion matrix:\n%s", confusion)


if __name__ == "__main__":
    main()

