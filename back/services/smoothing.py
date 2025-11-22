from typing import Optional, List
from utils.buffer import RollingBuffer


class SmoothingService:
    def __init__(self):
        pass

    def smooth(self, distributions: List[List[float]]) -> Optional[List[float]]:
        if not distributions:
            return None

        num_distributions = len(distributions)
        num_classes = len(distributions[0])

        averaged = []
        for i in range(num_classes):
            total = sum(dist[i] for dist in distributions)
            averaged.append(total / num_distributions)

        return averaged

    def add_and_smooth(
        self, new_distribution: List[float], buffer: RollingBuffer
    ) -> Optional[List[float]]:
        buffer.append(new_distribution)

        if not buffer.is_full():
            return None

        all_distributions = buffer.get_all()
        if all_distributions is None:
            return None

        return self.smooth(all_distributions)
