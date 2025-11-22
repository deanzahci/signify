from collections import deque
from typing import Any, Optional


class RollingBuffer:
    def __init__(self, max_size: int):
        self.max_size = max_size
        self.buffer = deque(maxlen=max_size)

    def append(self, item: Any) -> None:
        self.buffer.append(item)

    def clear(self) -> None:
        self.buffer.clear()

    def is_full(self) -> bool:
        return len(self.buffer) == self.max_size

    def get_all(self) -> Optional[list]:
        if not self.is_full():
            return None
        return list(self.buffer)

    def __len__(self) -> int:
        return len(self.buffer)
