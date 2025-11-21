"""
ASL Predictor for real-time inference with full softmax distribution output.

This module provides a simple interface for loading trained models and
running inference on MediaPipe hand landmarks to predict ASL letters/words
with confidence scores for all classes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn

from ..models.mlp import MLPClassifier
from ..models.lstm import LSTMClassifier
from ..models.tcn import TCNClassifier


class ASLPredictor:
    """
    Wrapper for ASL classification models that returns full softmax distributions.
    
    Usage:
        predictor = ASLPredictor('backend/models/checkpoints/best_mlp.pt')
        
        # Input: PyTorch tensor [1, T, 21, 3] where T=1 for static images
        landmarks = torch.randn(1, 1, 21, 3)
        
        # Get full distribution
        distribution = predictor.predict_distribution(landmarks)
        # Returns: [{'letter': 'A', 'confidence': 0.85}, {'letter': 'B', 'confidence': 0.03}, ...]
    """
    
    def __init__(
        self,
        checkpoint_path: str | Path,
        device: Optional[str] = None,
    ):
        """
        Initialize predictor from a trained checkpoint.
        
        Args:
            checkpoint_path: Path to the .pt checkpoint file
            device: Device to run inference on ('cpu', 'cuda', 'mps'). Auto-detected if None.
        """
        self.checkpoint_path = Path(checkpoint_path)
        if not self.checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")
        
        # Auto-detect device
        if device is None:
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"
        self.device = torch.device(device)
        
        # Load checkpoint
        checkpoint = torch.load(self.checkpoint_path, map_location=self.device)
        
        # Extract metadata
        self.architecture = checkpoint["architecture"]
        self.num_classes = checkpoint["num_classes"]
        self.sequence_length = checkpoint["sequence_length"]
        self.feature_dim = checkpoint["feature_dim"]
        self.hidden_dim = checkpoint.get("hidden_dim", 128)
        self.dropout = checkpoint.get("dropout", 0.3)
        
        # Load label mapping
        self.label_map = checkpoint.get("label_map", {})
        if not self.label_map:
            # Fallback: create numeric labels if label_map missing
            self.label_map = {str(i): i for i in range(self.num_classes)}
        self.idx_to_label = {v: k for k, v in self.label_map.items()}
        
        # Build and load model
        self.model = self._build_model()
        self.model.load_state_dict(checkpoint["state_dict"])
        self.model.to(self.device)
        self.model.eval()
    
    def _build_model(self) -> nn.Module:
        """Build model architecture from checkpoint metadata."""
        if self.architecture == "mlp":
            return MLPClassifier(
                input_dim=self.feature_dim,
                hidden_dim=self.hidden_dim,
                num_classes=self.num_classes,
                dropout=self.dropout,
            )
        elif self.architecture == "lstm":
            return LSTMClassifier(
                input_dim=self.feature_dim,
                hidden_dim=self.hidden_dim,
                num_classes=self.num_classes,
                num_layers=2,
                dropout=self.dropout,
            )
        elif self.architecture == "tcn":
            return TCNClassifier(
                input_dim=self.feature_dim,
                hidden_dim=self.hidden_dim,
                num_classes=self.num_classes,
                num_levels=4,
                kernel_size=3,
                dropout=self.dropout,
            )
        else:
            raise ValueError(f"Unknown architecture: {self.architecture}")
    
    def predict_distribution(
        self,
        landmarks: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
        sort_by_confidence: bool = True,
    ) -> List[Dict[str, float]]:
        """
        Predict full softmax distribution for all classes.
        
        Args:
            landmarks: Input tensor [batch_size, sequence_length, 21, 3]
                      For static images: [1, 1, 21, 3]
                      For video sequences: [1, T, 21, 3]
            mask: Optional mask tensor [batch_size, sequence_length]
                  1.0 for valid frames, 0.0 for padding
            sort_by_confidence: If True, sort results by confidence (highest first)
        
        Returns:
            List of dicts with 'letter' and 'confidence' keys for each class.
            Example: [
                {'letter': 'A', 'confidence': 0.85},
                {'letter': 'B', 'confidence': 0.03},
                ...
            ]
        """
        # Ensure batch dimension
        if landmarks.dim() == 3:
            landmarks = landmarks.unsqueeze(0)  # [1, T, 21, 3]
        
        # Move to device
        landmarks = landmarks.to(self.device)
        if mask is not None:
            mask = mask.to(self.device)
        
        # Run inference
        with torch.no_grad():
            logits = self.model(landmarks, mask)  # [batch_size, num_classes]
            probs = torch.softmax(logits, dim=-1)  # [batch_size, num_classes]
        
        # Convert to list of dicts (handle batch_size=1)
        probs = probs.squeeze(0).cpu().numpy()  # [num_classes]
        
        distribution = [
            {
                "letter": self.idx_to_label.get(i, f"class_{i}"),
                "confidence": float(probs[i]),
            }
            for i in range(len(probs))
        ]
        
        if sort_by_confidence:
            distribution.sort(key=lambda x: x["confidence"], reverse=True)
        
        return distribution
    
    def predict_top_k(
        self,
        landmarks: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
        k: int = 5,
    ) -> List[Dict[str, float]]:
        """
        Predict top-k most likely classes.
        
        Args:
            landmarks: Input tensor [batch_size, sequence_length, 21, 3]
            mask: Optional mask tensor
            k: Number of top predictions to return
        
        Returns:
            List of top-k predictions sorted by confidence.
        """
        distribution = self.predict_distribution(landmarks, mask, sort_by_confidence=True)
        return distribution[:k]
    
    def predict_single(
        self,
        landmarks: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
    ) -> Dict[str, float]:
        """
        Predict single most likely class.
        
        Args:
            landmarks: Input tensor [batch_size, sequence_length, 21, 3]
            mask: Optional mask tensor
        
        Returns:
            Dict with 'letter' and 'confidence' for top prediction.
            Example: {'letter': 'A', 'confidence': 0.85}
        """
        distribution = self.predict_distribution(landmarks, mask, sort_by_confidence=True)
        return distribution[0]
    
    def predict_batch(
        self,
        landmarks_batch: torch.Tensor,
        masks_batch: Optional[torch.Tensor] = None,
    ) -> List[List[Dict[str, float]]]:
        """
        Predict distributions for a batch of inputs.
        
        Args:
            landmarks_batch: Tensor [batch_size, sequence_length, 21, 3]
            masks_batch: Optional tensor [batch_size, sequence_length]
        
        Returns:
            List of distributions, one per batch item.
        """
        landmarks_batch = landmarks_batch.to(self.device)
        if masks_batch is not None:
            masks_batch = masks_batch.to(self.device)
        
        with torch.no_grad():
            logits = self.model(landmarks_batch, masks_batch)
            probs = torch.softmax(logits, dim=-1).cpu().numpy()
        
        results = []
        for batch_probs in probs:
            distribution = [
                {
                    "letter": self.idx_to_label.get(i, f"class_{i}"),
                    "confidence": float(batch_probs[i]),
                }
                for i in range(len(batch_probs))
            ]
            distribution.sort(key=lambda x: x["confidence"], reverse=True)
            results.append(distribution)
        
        return results
    
    def get_label_map(self) -> Dict[str, int]:
        """Return the label-to-index mapping."""
        return self.label_map.copy()
    
    def get_model_info(self) -> Dict[str, any]:
        """Return model metadata."""
        return {
            "architecture": self.architecture,
            "num_classes": self.num_classes,
            "sequence_length": self.sequence_length,
            "feature_dim": self.feature_dim,
            "hidden_dim": self.hidden_dim,
            "dropout": self.dropout,
            "device": str(self.device),
            "checkpoint_path": str(self.checkpoint_path),
        }

