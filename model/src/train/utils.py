"""
Shared utilities for dataset loading and model builders.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Tuple

import numpy as np
import torch
import torch.nn as nn

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.models.lstm import LSTMClassifier
from src.models.mlp import MLPClassifier
from src.models.tcn import TCNClassifier


class LandmarkDataset(torch.utils.data.Dataset):
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
        return MLPClassifier(
            input_dim=sequence_length * feature_dim,
            hidden_dims=(hidden_dim, max(hidden_dim // 2, 32)),
            num_classes=num_classes,
            dropout=dropout,
        )
    if architecture == "lstm":
        return LSTMClassifier(
            input_dim=feature_dim,
            hidden_dim=hidden_dim,
            num_layers=2,
            num_classes=num_classes,
            dropout=dropout,
            bidirectional=True,
        )
    if architecture == "tcn":
        return TCNClassifier(
            input_dim=feature_dim,
            num_classes=num_classes,
            num_channels=(hidden_dim, hidden_dim),
            dropout=dropout,
        )
    raise ValueError(f"Unknown architecture {architecture}")

