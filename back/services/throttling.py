import time
from typing import Optional

from config import THROTTLE_MIN_INTERVAL_MS, THROTTLE_PROBABILITY_THRESHOLD


class ThrottlingService:
    def __init__(self):
        self.last_transmission_time: float = 0.0
        self.last_maxarg_letter: Optional[str] = None
        self.last_target_arg_prob: Optional[float] = None

    def should_send(
        self, maxarg_letter: str, target_arg_prob: float, force: bool = False
    ) -> bool:
        if force:
            return True

        current_time = time.time()
        time_elapsed_ms = (current_time - self.last_transmission_time) * 1000

        if time_elapsed_ms < THROTTLE_MIN_INTERVAL_MS:
            return False

        letter_changed = self.last_maxarg_letter != maxarg_letter

        if self.last_target_arg_prob is None:
            prob_changed = True
        else:
            prob_diff = abs(target_arg_prob - self.last_target_arg_prob)
            prob_changed = prob_diff > THROTTLE_PROBABILITY_THRESHOLD

        return letter_changed or prob_changed

    def mark_sent(self, maxarg_letter: str, target_arg_prob: float) -> None:
        self.last_transmission_time = time.time()
        self.last_maxarg_letter = maxarg_letter
        self.last_target_arg_prob = target_arg_prob

    def reset(self) -> None:
        self.last_transmission_time = 0.0
        self.last_maxarg_letter = None
        self.last_target_arg_prob = None
