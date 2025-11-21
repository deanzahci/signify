"""
LSTM-based temporal classifier for sequences of landmarks.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class LSTMClassifier(nn.Module):
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int,
        num_layers: int,
        num_classes: int,
        dropout: float = 0.3,
        bidirectional: bool = True,
    ):
        super().__init__()
        self.bidirectional = bidirectional
        self.rnn = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
            bidirectional=bidirectional,
        )
        direction = 2 if bidirectional else 1
        self.classifier = nn.Sequential(
            nn.LayerNorm(direction * hidden_dim),
            nn.Dropout(dropout),
            nn.Linear(direction * hidden_dim, num_classes),
        )

    def forward(self, x):
        _, (hidden, _) = self.rnn(x)
        last = hidden[-1]
        if self.bidirectional and hidden.shape[0] >= 2:
            last = torch.cat([hidden[-2], hidden[-1]], dim=-1)
        return self.classifier(last)

