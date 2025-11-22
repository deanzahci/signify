import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional

from app.state import PipelineState
from services.inference import InferenceService
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
        self.inference_service = InferenceService()
        self.smoothing_service = SmoothingService()
        self.metrics = metrics or PerformanceMetrics()
        self.logger = logging.getLogger(__name__)

    async def _run_in_executor(self, func, *args):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, func, *args)

    async def process_frame(self, jpeg_bytes: bytes) -> Optional[Dict]:
        start_time = time.time()

        try:
            landmarks = await self._run_in_executor(
                self.preprocessing_service.process, jpeg_bytes
            )

            if landmarks is None:
                self.logger.debug("No hands detected, skipping frame")
                return None

            self.state.keypoint_buffer.append(landmarks)
            self.logger.debug(
                f"Buffered landmarks: {len(self.state.keypoint_buffer)}/32"
            )

            if not self.state.keypoint_buffer.is_full():
                return None

            sequence = self.state.keypoint_buffer.get_all()
            if sequence is None:
                return None

            distribution = await self._run_in_executor(
                self.inference_service.predict, sequence
            )

            self.metrics.record_inference()

            smoothed = self.smoothing_service.add_and_smooth(
                distribution, self.state.smoothing_buffer
            )

            if smoothed is None:
                self.logger.debug("Smoothing buffer not full yet")
                return None

            maxarg_letter, target_arg_prob = extract_metrics(
                smoothed, self.state.current_target_letter
            )

            self.logger.info(
                f"Inference result: {maxarg_letter} "
                f"(target: {self.state.current_target_letter}, "
                f"prob: {target_arg_prob:.3f})"
            )

            duration = time.time() - start_time
            self.metrics.record_frame_time(duration)

            return {"maxarg_letter": maxarg_letter, "target_arg_prob": target_arg_prob}

        except Exception as e:
            self.logger.error(f"Error processing frame: {e}", exc_info=True)
            self.metrics.record_error()
            return None
