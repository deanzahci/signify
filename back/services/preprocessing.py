import logging
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np

from config import (
    HAND_LANDMARKS,
    MEDIAPIPE_MAX_NUM_HANDS,
    MEDIAPIPE_MIN_DETECTION_CONFIDENCE,
    MEDIAPIPE_MIN_TRACKING_CONFIDENCE,
    MEDIAPIPE_MODEL_COMPLEXITY,
    TOTAL_LANDMARKS,
)


class PreprocessingService:
    def __init__(self):
        self.mp_hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=MEDIAPIPE_MAX_NUM_HANDS,
            min_detection_confidence=MEDIAPIPE_MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=MEDIAPIPE_MIN_TRACKING_CONFIDENCE,
            model_complexity=MEDIAPIPE_MODEL_COMPLEXITY,
        )
        self.logger = logging.getLogger(__name__)

    def decode_jpeg(self, jpeg_bytes: bytes) -> Optional[np.ndarray]:
        try:
            nparr = np.frombuffer(jpeg_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                return None
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            return image_rgb
        except Exception as e:
            self.logger.error(f"Failed to decode JPEG: {e}")
            return None

    def landmarks_to_array(self, hand_landmarks) -> np.ndarray:
        landmarks = []
        for landmark in hand_landmarks.landmark:
            landmarks.append([landmark.x, landmark.y, landmark.z])
        return np.array(landmarks, dtype=np.float32)

    def find_hand(self, results, handedness: str):
        for idx, classification in enumerate(results.multi_handedness):
            if classification.classification[0].label == handedness:
                return results.multi_hand_landmarks[idx]
        return None

    def extract_landmarks(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract landmarks from primary hand (single hand detection).

        Returns:
            numpy array of shape (21, 3) or None if no hands detected
        """
        results = self.mp_hands.process(image)

        if not results.multi_hand_landmarks:
            return None

        # Select primary hand (first detected hand)
        # The ONNX model only requires single hand (21 landmarks)
        primary_hand = results.multi_hand_landmarks[0]

        # Convert to numpy array
        hand_array = self.landmarks_to_array(primary_hand)

        return hand_array  # Shape: (21, 3)

    def process(self, jpeg_bytes: bytes) -> Optional[np.ndarray]:
        image = self.decode_jpeg(jpeg_bytes)
        if image is None:
            return None

        landmarks = self.extract_landmarks(image)
        return landmarks

    def __del__(self):
        if hasattr(self, "mp_hands"):
            self.mp_hands.close()
