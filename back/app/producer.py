import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Optional

from app.consumer import Consumer
from app.state import PipelineState
from services.throttling import ThrottlingService
from utils.async_helpers import format_error_response, format_response, validate_message
from utils.metrics import PerformanceMetrics


class Producer:
    def __init__(
        self,
        state: PipelineState,
        executor: ThreadPoolExecutor,
        metrics: Optional[PerformanceMetrics] = None,
    ):
        self.state = state
        self.executor = executor
        self.metrics = metrics or PerformanceMetrics()
        self.consumer = Consumer(state, executor, self.metrics)
        self.throttling_service = ThrottlingService()
        self.current_task: Optional[asyncio.Task] = None
        self.logger = logging.getLogger(__name__)

    def _parse_message(self, message: Any):
        validated = validate_message(message)
        if validated is None:
            self.logger.error("Message validation failed")
        return validated

    def _is_consumer_busy(self) -> bool:
        return self.current_task is not None and not self.current_task.done()

    async def _emergency_reset(self, new_letter: str, websocket) -> None:
        self.logger.info(f"Emergency reset triggered: new_letter={new_letter}")

        if self.current_task and not self.current_task.done():
            self.current_task.cancel()
            try:
                await self.current_task
            except asyncio.CancelledError:
                self.logger.debug("Consumer task cancelled successfully")

        self.state.reset(new_letter)
        self.throttling_service.reset()

        await self._send_response(
            websocket, maxarg_letter="A", target_arg_prob=0.0, force=True
        )

    async def _send_response(
        self, websocket, maxarg_letter: str, target_arg_prob: float, force: bool = False
    ) -> None:
        if not force:
            should_send = self.throttling_service.should_send(
                maxarg_letter, target_arg_prob
            )
            if not should_send:
                self.logger.debug("Throttling: not sending response")
                return

        response_str = format_response(maxarg_letter, target_arg_prob)

        try:
            await websocket.send(response_str)
            self.throttling_service.mark_sent(maxarg_letter, target_arg_prob)
            self.logger.info(
                f"Sent: {maxarg_letter} (target_prob: {target_arg_prob:.3f})"
            )
        except Exception as e:
            self.logger.error(f"Failed to send response: {e}", exc_info=True)

    async def handle_message(self, message: Any, websocket) -> None:
        parsed = self._parse_message(message)
        if parsed is None:
            return

        jpeg_blob = parsed["jpeg_blob"]
        new_letter = parsed["new_word_letter"]

        if new_letter is not None:
            await self._emergency_reset(new_letter, websocket)

        if self._is_consumer_busy():
            self.logger.debug("Consumer busy, dropping frame (backpressure)")
            self.metrics.record_dropped_frame()
            return

        self.current_task = asyncio.create_task(self.consumer.process_frame(jpeg_blob))

        try:
            result = await self.current_task

            if result is not None:
                await self._send_response(
                    websocket,
                    maxarg_letter=result["maxarg_letter"],
                    target_arg_prob=result["target_arg_prob"],
                )
        except asyncio.CancelledError:
            self.logger.debug("Consumer task was cancelled")
        except Exception as e:
            self.logger.error(f"Error in consumer task: {e}", exc_info=True)
        finally:
            self.current_task = None
