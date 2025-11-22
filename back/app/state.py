from typing import Optional
from utils.buffer import RollingBuffer
from config import KEYPOINT_BUFFER_SIZE, SLIDING_WINDOW_SIZE


class PipelineState:
    def __init__(self):
        self.keypoint_buffer = RollingBuffer(max_size=KEYPOINT_BUFFER_SIZE)
        self.smoothing_buffer = RollingBuffer(max_size=SLIDING_WINDOW_SIZE)
        self.current_target_letter: Optional[str] = None

    def reset(self, new_target_letter: Optional[str] = None) -> None:
        self.keypoint_buffer.clear()
        self.smoothing_buffer.clear()
        self.current_target_letter = new_target_letter
