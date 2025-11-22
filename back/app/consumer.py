import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional

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
        Process single frame with per-frame ONNX inference.

        Note: Buffer is still populated for potential future use with
        sequence models, but inference runs immediately on each frame
        with the new ONNX model (sequence_length=1).
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

            # 2. Keep buffering for future sequence models (optional)
            self.state.keypoint_buffer.append(landmarks)
            self.logger.debug(
                f"Buffered landmarks: {len(self.state.keypoint_buffer)}/32 "
                f"(buffer maintained but not used for ONNX inference)"
            )

            # 3. Run inference immediately on current frame (bypass buffer)
            predicted_letter, confidence = await self._run_in_executor(
                self.onnx_predictor.predict, landmarks
            )

            self.logger.debug(f"Raw ONNX prediction: {predicted_letter} ({confidence:.4f})")

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
                f"Inference result: {maxarg_letter} "
                f"(target: {self.state.current_target_letter}, "
                f"prob: {target_arg_prob:.3f}, "
                f"max_prob: {max_prob:.3f})"
            )

            duration = time.time() - start_time
            self.metrics.record_frame_time(duration)

            return {"maxarg_letter": maxarg_letter, "target_arg_prob": target_arg_prob}

        except Exception as e:
            self.logger.error(f"Error processing frame: {e}", exc_info=True)
            self.metrics.record_error()
            return None
