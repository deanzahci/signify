"""
ONNX-based ASL predictor for single-hand alphabet recognition.

This module provides inference capabilities using ONNX Runtime for
real-time ASL letter classification with single hand input.
"""

import logging
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import onnxruntime as ort

from config import ONNX_MODEL_PATH, ONNX_NUM_CLASSES


class ONNXPredictor:
    """
    ONNX-based ASL predictor for single-hand alphabet recognition.

    Key features:
    - Accepts single hand landmarks (21, 3)
    - Applies normalization (wrist-relative + scaling)
    - Returns probability distribution over 26 classes (A-Z)
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize ONNX inference session.

        Args:
            model_path: Path to .onnx model file. If None, uses default from config.
        """
        self.logger = logging.getLogger(__name__)
        self.model_path = Path(model_path) if model_path else ONNX_MODEL_PATH
        self.num_classes = ONNX_NUM_CLASSES
        self.mock_mode = False

        # Load ONNX model
        if not self.model_path.exists():
            self.logger.warning(
                f"ONNX model not found at {self.model_path}. "
                "Running in mock mode for development."
            )
            self.mock_mode = True
            self.session = None
            return

        try:
            # Initialize ONNX Runtime session
            # Try GPU providers first, fallback to CPU
            providers = ["CPUExecutionProvider"]
            if ort.get_device() == "GPU":
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]

            self.session = ort.InferenceSession(
                str(self.model_path), providers=providers
            )

            # Get input/output names from model
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name

            # Log model info
            input_shape = self.session.get_inputs()[0].shape
            output_shape = self.session.get_outputs()[0].shape

            self.logger.info(f"Loaded ONNX model from {self.model_path}")
            self.logger.info(f"Input: {self.input_name} {input_shape}")
            self.logger.info(f"Output: {self.output_name} {output_shape}")
            self.logger.info(f"Providers: {self.session.get_providers()}")

        except Exception as e:
            self.logger.error(f"Failed to load ONNX model: {e}")
            self.mock_mode = True
            self.session = None

    def normalize_landmarks(self, landmarks: np.ndarray) -> np.ndarray:
        """
        Apply model-specific normalization to landmarks.

        Normalization steps:
        1. Subtract wrist position (landmark 0) to make coordinates wrist-relative
        2. Scale by max absolute value for size invariance

        Args:
            landmarks: numpy array of shape (21, 3)

        Returns:
            Normalized landmarks of shape (21, 3)
        """
        # Make a copy to avoid modifying input
        coords = landmarks.copy().astype(np.float32)

        # Step 1: Subtract wrist (landmark 0) - wrist-relative coordinates
        wrist = coords[0].copy()
        coords = coords - wrist

        # Step 2: Scale by max absolute value for size invariance
        max_abs = np.max(np.abs(coords))
        if max_abs > 0:
            coords = coords / max_abs

        return coords

    def _flatten_landmarks(self, landmarks: np.ndarray) -> np.ndarray:
        """
        Flatten landmarks from (21, 3) to (63,) for model input.

        Args:
            landmarks: numpy array of shape (21, 3)

        Returns:
            Flattened array of shape (63,)
        """
        if landmarks.shape != (21, 3):
            raise ValueError(f"Expected shape (21, 3), got {landmarks.shape}")

        return landmarks.flatten()  # (21, 3) → (63,)

    def predict(self, landmarks: np.ndarray) -> Tuple[str, float]:
        """
        Run inference on single hand landmarks.

        Args:
            landmarks: numpy array of shape (21, 3) - single hand

        Returns:
            Tuple of (predicted_letter, confidence)
            Example: ('A', 0.95)
        """
        try:
            # Validate input shape
            if landmarks.shape != (21, 3):
                raise ValueError(
                    f"Expected landmarks shape (21, 3), got {landmarks.shape}"
                )

            # Mock mode for development/testing
            if self.mock_mode:
                import time

                mock_class_idx = int(time.time() / 2.0) % self.num_classes
                predicted_letter = chr(ord("A") + mock_class_idx)
                return predicted_letter, 0.95

            # Apply normalization
            normalized = self.normalize_landmarks(landmarks)

            # Reshape for ONNX model: [batch=1, seq_len=1, landmarks=21, coords=3]
            input_tensor = normalized.reshape(1, 1, 21, 3).astype(np.float32)

            # Run inference
            outputs = self.session.run(
                [self.output_name], {self.input_name: input_tensor}
            )

            # Get logits/probabilities
            logits = outputs[0][0]  # Shape: (26,)

            # Apply softmax (in case model outputs raw logits)
            exp_logits = np.exp(logits - np.max(logits))  # Numerical stability
            probs = exp_logits / np.sum(exp_logits)

            # Get top prediction
            top_idx = np.argmax(probs)
            top_prob = probs[top_idx]

            # Convert index to letter (0='A', 1='B', ..., 25='Z')
            predicted_letter = chr(ord("A") + top_idx)

            return predicted_letter, float(top_prob)

        except Exception as e:
            self.logger.error(f"Prediction failed: {e}", exc_info=True)
            # Return default on error
            return "A", 0.0

    def predict_sequence(self, landmarks_sequence: np.ndarray) -> Tuple[str, float]:
        """
        Run inference on 32-frame sequence of hand landmarks.

        Args:
            landmarks_sequence: numpy array of shape (32, 21, 3) - 32 frames of single hand

        Returns:
            Tuple of (predicted_letter, confidence)
            predicted_letter can be: A-Z, "SPACE", "DELETE", "NOTHING"
        """
        try:
            # Validate input shape
            if landmarks_sequence.shape != (32, 21, 3):
                raise ValueError(
                    f"Expected landmarks_sequence shape (32, 21, 3), got {landmarks_sequence.shape}"
                )

            # Mock mode for development/testing
            if self.mock_mode:
                import time

                mock_class_idx = int(time.time() / 2.0) % self.num_classes
                if mock_class_idx < 26:
                    predicted_letter = chr(ord("A") + mock_class_idx)
                elif mock_class_idx == 26:
                    predicted_letter = "SPACE"
                elif mock_class_idx == 27:
                    predicted_letter = "DELETE"
                else:
                    predicted_letter = "NOTHING"
                return predicted_letter, 0.95

            # Apply normalization and flatten PER FRAME
            normalized_flattened = []
            for i in range(32):
                # Normalize frame
                normalized = self.normalize_landmarks(landmarks_sequence[i])
                # Flatten from (21, 3) to (63,)
                flattened = self._flatten_landmarks(normalized)
                normalized_flattened.append(flattened)

            # Stack to (32, 63)
            sequence_array = np.stack(normalized_flattened, axis=0)

            # Reshape for ONNX model: [batch=1, seq_len=32, features=63]
            input_tensor = sequence_array.reshape(1, 32, 63).astype(np.float32)

            self.logger.debug(f"Input tensor shape: {input_tensor.shape}")

            # Run inference
            outputs = self.session.run(
                [self.output_name], {self.input_name: input_tensor}
            )

            # Get logits/probabilities
            logits = outputs[0][0]  # Shape: (29,)

            # Apply softmax
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)

            # Get top prediction
            top_idx = np.argmax(probs)
            top_prob = probs[top_idx]

            # Convert index to letter/special token (0-25=A-Z, 26=SPACE, 27=DELETE, 28=NOTHING)
            if top_idx < 26:
                predicted_letter = chr(ord("A") + top_idx)
            elif top_idx == 26:
                predicted_letter = "SPACE"
            elif top_idx == 27:
                predicted_letter = "DELETE"
            elif top_idx == 28:
                predicted_letter = "NOTHING"
            else:
                self.logger.warning(f"Unexpected class index: {top_idx}")
                predicted_letter = "A"

            self.logger.debug(
                f"Prediction: {predicted_letter} (confidence: {top_prob:.4f})"
            )

            return predicted_letter, float(top_prob)

        except Exception as e:
            self.logger.error(f"Sequence prediction failed: {e}", exc_info=True)
            return "A", 0.0

    def predict_sequence_distribution(
        self, landmarks_sequence: np.ndarray
    ) -> np.ndarray:
        """
        Return full probability distribution over all classes for 32-frame sequence.

        Args:
            landmarks_sequence: numpy array of shape (32, 21, 3)

        Returns:
            numpy array of shape (29,) with probabilities for all classes
        """
        try:
            if landmarks_sequence.shape != (32, 21, 3):
                raise ValueError(
                    f"Expected landmarks_sequence shape (32, 21, 3), got {landmarks_sequence.shape}"
                )

            # Mock mode
            if self.mock_mode:
                import time

                mock_class_idx = int(time.time() / 2.0) % self.num_classes
                probs = np.full(self.num_classes, 0.002, dtype=np.float32)
                probs[mock_class_idx] = 0.95
                return probs

            # Apply normalization and flatten per frame
            normalized_flattened = []
            for i in range(32):
                normalized = self.normalize_landmarks(landmarks_sequence[i])
                flattened = self._flatten_landmarks(normalized)
                normalized_flattened.append(flattened)

            # Stack to (32, 63)
            sequence_array = np.stack(normalized_flattened, axis=0)

            # Reshape for ONNX model: [1, 32, 63]
            input_tensor = sequence_array.reshape(1, 32, 63).astype(np.float32)

            # Run inference
            outputs = self.session.run(
                [self.output_name], {self.input_name: input_tensor}
            )

            # Get probabilities
            logits = outputs[0][0]
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)

            return probs

        except Exception as e:
            self.logger.error(
                f"Sequence distribution prediction failed: {e}", exc_info=True
            )
            return np.ones(self.num_classes, dtype=np.float32) / self.num_classes

    def predict_distribution(self, landmarks: np.ndarray) -> np.ndarray:
        """
        Return full probability distribution over all classes.

        Useful for smoothing and visualization of model confidence.

        Args:
            landmarks: numpy array of shape (21, 3)

        Returns:
            numpy array of shape (26,) with probabilities for A-Z
        """
        try:
            # Validate input shape
            if landmarks.shape != (21, 3):
                raise ValueError(
                    f"Expected landmarks shape (21, 3), got {landmarks.shape}"
                )

            # Mock mode
            if self.mock_mode:
                import time

                mock_class_idx = int(time.time() / 2.0) % self.num_classes
                probs = np.full(self.num_classes, 0.002, dtype=np.float32)
                probs[mock_class_idx] = 0.95
                return probs

            # Apply normalization
            normalized = self.normalize_landmarks(landmarks)

            # Reshape for ONNX model
            input_tensor = normalized.reshape(1, 1, 21, 3).astype(np.float32)

            # Run inference
            outputs = self.session.run(
                [self.output_name], {self.input_name: input_tensor}
            )

            # Get probabilities
            logits = outputs[0][0]
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)

            return probs

        except Exception as e:
            self.logger.error(f"Distribution prediction failed: {e}", exc_info=True)
            # Return uniform distribution on error
            return np.ones(self.num_classes, dtype=np.float32) / self.num_classes

    def get_model_info(self) -> dict:
        """
        Return model metadata and configuration.

        Returns:
            Dictionary with model information
        """
        info = {
            "model_path": str(self.model_path),
            "num_classes": self.num_classes,
            "mock_mode": self.mock_mode,
        }

        if self.session is not None:
            info.update(
                {
                    "input_name": self.input_name,
                    "output_name": self.output_name,
                    "providers": self.session.get_providers(),
                    "input_shape": self.session.get_inputs()[0].shape,
                    "output_shape": self.session.get_outputs()[0].shape,
                }
            )

        return info
