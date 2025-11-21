"""
Multi-layer perceptron for static/flattened landmarks.
"""

from __future__ import annotations

from typing import Sequence

import torch.nn as nn


class MLPClassifier(nn.Module):
    def __init__(self, input_dim: int, hidden_dims: Sequence[int], num_classes: int, dropout: float = 0.1):
        super().__init__()
        layers = []
        current_dim = input_dim
        for hidden in hidden_dims:
            layers.append(nn.Linear(current_dim, hidden))
            layers.append(nn.LayerNorm(hidden))
            layers.append(nn.ReLU(inplace=True))
            layers.append(nn.Dropout(p=dropout))
            current_dim = hidden
        layers.append(nn.Linear(current_dim, num_classes))
        self.model = nn.Sequential(*layers)

    def forward(self, x):
        x = x.flatten(start_dim=1)
        return self.model(x)

