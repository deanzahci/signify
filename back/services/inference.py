import sys
import numpy as np
import torch
from pathlib import Path
from typing import List, Optional
import logging

from config import LSTM_MODEL_PATH, LSTM_NUM_CLASSES

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "model"))


class InferenceService:
    def __init__(self, model_path: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.model_path = Path(model_path) if model_path else LSTM_MODEL_PATH
        self.num_classes = LSTM_NUM_CLASSES
        self.predictor = None
        self.mock_mode = True

        if self.model_path.exists():
            try:
                from src.inference import ASLPredictor

                self.predictor = ASLPredictor(str(self.model_path))
                self.mock_mode = False
                self.logger.info(f"Loaded model from {self.model_path}")
            except Exception as e:
                self.logger.warning(f"Failed to load model, using mock mode: {e}")
                self.mock_mode = True
        else:
            self.logger.info(f"Model not found at {self.model_path}, using mock mode")

    def predict(self, keypoint_sequence: List[np.ndarray]) -> List[float]:
        if len(keypoint_sequence) == 0:
            return [1.0 / self.num_classes] * self.num_classes

        sequence_array = np.stack(keypoint_sequence, axis=0)

        if self.mock_mode:
            return [1.0 / self.num_classes] * self.num_classes
        else:
            try:
                tensor = torch.from_numpy(sequence_array).float().unsqueeze(0)

                distribution = self.predictor.predict_distribution(
                    tensor, sort_by_confidence=False
                )

                probs = [d["confidence"] for d in distribution]

                return probs
            except Exception as e:
                self.logger.error(
                    f"Inference failed, returning uniform distribution: {e}"
                )
                return [1.0 / self.num_classes] * self.num_classes
