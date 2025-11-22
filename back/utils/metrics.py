from typing import Optional, Tuple
import time
from collections import deque


def index_to_char(index: int) -> str:
    """Convert class index to character, including special tokens."""
    if 0 <= index <= 25:
        return chr(ord("A") + index)
    elif index == 26:
        return "SPACE"
    elif index == 27:
        return "DELETE"
    elif index == 28:
        return "NOTHING"
    else:
        return "A"  # Fallback


def char_to_index(char: str) -> int:
    return ord(char.upper()) - ord("A")


def extract_metrics(
    probability_distribution: list, target_letter: Optional[str] = None
) -> Tuple[str, float]:
    if not probability_distribution:
        return "A", 0.0

    max_index = probability_distribution.index(max(probability_distribution))
    maxarg_letter = index_to_char(max_index)

    if target_letter is None:
        target_arg_prob = 0.0
    else:
        target_index = char_to_index(target_letter)
        if 0 <= target_index < len(probability_distribution):
            target_arg_prob = probability_distribution[target_index]
        else:
            target_arg_prob = 0.0

    return maxarg_letter, target_arg_prob


class PerformanceMetrics:
    """
    Track performance metrics for the pipeline.
    """

    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.frame_times = deque(maxlen=window_size)
        self.dropped_frames = 0
        self.processed_frames = 0
        self.inference_count = 0
        self.error_count = 0
        self.start_time = time.time()

    def record_frame_time(self, duration: float):
        self.frame_times.append(duration)
        self.processed_frames += 1

    def record_dropped_frame(self):
        self.dropped_frames += 1

    def record_inference(self):
        self.inference_count += 1

    def record_error(self):
        self.error_count += 1

    def get_stats(self) -> dict:
        if not self.frame_times:
            avg_time = 0.0
            fps = 0.0
        else:
            avg_time = sum(self.frame_times) / len(self.frame_times)
            fps = 1.0 / avg_time if avg_time > 0 else 0.0

        uptime = time.time() - self.start_time
        drop_rate = (
            self.dropped_frames / (self.dropped_frames + self.processed_frames)
            if (self.dropped_frames + self.processed_frames) > 0
            else 0.0
        )

        return {
            "uptime_seconds": round(uptime, 2),
            "processed_frames": self.processed_frames,
            "dropped_frames": self.dropped_frames,
            "drop_rate": round(drop_rate * 100, 2),
            "inference_count": self.inference_count,
            "error_count": self.error_count,
            "avg_frame_time_ms": round(avg_time * 1000, 2),
            "fps": round(fps, 2),
        }
