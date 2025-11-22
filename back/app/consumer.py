import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional

import numpy as np

from app.state import PipelineState
from services.onnx_predictor import ONNXPredictor
from services.preprocessing import PreprocessingService
from services.smoothing import SmoothingService
from utils.metrics import PerformanceMetrics, extract_metrics


class Consumer:
    def __init__(
        self,
        state: PipelineState,
        executor: ThreadPoolExecutor,
        metrics: Optional[PerformanceMetrics] = None,
    ):
        self.state = state
        self.executor = executor
        self.preprocessing_service = PreprocessingService()
        self.onnx_predictor = ONNXPredictor()
        self.smoothing_service = SmoothingService()
        self.metrics = metrics or PerformanceMetrics()
        self.logger = logging.getLogger(__name__)

    async def _run_in_executor(self, func, *args):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, func, *args)

    async def process_frame(self, jpeg_bytes: bytes) -> Optional[Dict]:
        """
        Process single frame with LSTM sequence-based inference.

        Buffers 32 frames before running inference on the full sequence.
        Returns default response while waiting for buffer to fill.
        """
        start_time = time.time()

        try:
            # 1. Preprocessing: extract landmarks (now returns (21, 3) single hand)
            landmarks = await self._run_in_executor(
                self.preprocessing_service.process, jpeg_bytes
            )

            if landmarks is None:
                self.logger.debug("No hands detected, skipping frame")
                return None

            # 2. Buffer landmarks until we have 32 frames
            self.state.keypoint_buffer.append(landmarks)
            self.logger.debug(
                f"Buffered landmarks: {len(self.state.keypoint_buffer)}/32 frames"
            )

            # 3. Check if buffer is full (32 frames required for LSTM)
            if not self.state.keypoint_buffer.is_full():
                self.logger.debug("Buffer not full yet, waiting for more frames")
                # Return default response for UX feedback
                return {"maxarg_letter": "A", "target_arg_prob": 0.0}

            # 4. Get sequence of 32 frames
            sequence = self.state.keypoint_buffer.get_all()
            if sequence is None:
                self.logger.warning("Buffer full but get_all() returned None")
                return None

            # 5. Stack frames into sequence array
            sequence_array = np.stack(sequence, axis=0)  # Shape: (32, 21, 3)
            self.logger.debug(f"Stacked sequence shape: {sequence_array.shape}")

            # 6. Run inference on 32-frame sequence
            predicted_letter, confidence = await self._run_in_executor(
                self.onnx_predictor.predict_sequence, sequence_array
            )

            self.logger.debug(
                f"LSTM sequence prediction: {predicted_letter} ({confidence:.4f})"
            )

            self.metrics.record_inference()

            # 7. Get full distribution for smoothing
            distribution = await self._run_in_executor(
                self.onnx_predictor.predict_sequence_distribution, sequence_array
            )

            # 3. Run inference immediately on current frame (bypass buffer)
            predicted_letter, confidence = await self._run_in_executor(
                self.onnx_predictor.predict, landmarks
            )

            self.logger.debug(
                f"Raw ONNX prediction: {predicted_letter} ({confidence:.4f})"
            )

            self.metrics.record_inference()

            # 4. Optional: Apply smoothing to predictions over time
            # Get full distribution for smoothing
            distribution = await self._run_in_executor(
                self.onnx_predictor.predict_distribution, landmarks
            )

            # Convert to list format expected by smoothing service
            distribution_list = distribution.tolist()

            # Apply smoothing over last N frames
            smoothed = self.smoothing_service.add_and_smooth(
                distribution_list, self.state.smoothing_buffer
            )

            if smoothed is None:
                self.logger.debug("Smoothing buffer not full yet")
                return None

            # Extract metrics from smoothed distribution
            maxarg_letter, target_arg_prob = extract_metrics(
                smoothed, self.state.current_target_letter
            )

            max_prob = max(smoothed) if smoothed else 0.0

            self.logger.info(
                f"LSTM inference result: {maxarg_letter} "
                f"(target: {self.state.current_target_letter}, "
                f"prob: {target_arg_prob:.3f}, "
                f"max_prob: {max_prob:.3f}, "
                f"buffer: 32/32 frames)"
            )

            duration = time.time() - start_time
            self.metrics.record_frame_time(duration)

            # Determine what probability to send back
            # If we have a target, send the probability of that target (accuracy)
            # If we don't (Free Mode), send the max probability (confidence)
            display_prob = (
                target_arg_prob if self.state.current_target_letter else max_prob
            )

            return {"maxarg_letter": maxarg_letter, "target_arg_prob": display_prob}

        except Exception as e:
            self.logger.error(f"Error processing frame: {e}", exc_info=True)
            self.metrics.record_error()
            return None
