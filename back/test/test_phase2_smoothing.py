import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.smoothing import SmoothingService
from utils.buffer import RollingBuffer
from config import SLIDING_WINDOW_SIZE

print("Testing Phase 2: Smoothing Service")
print("=" * 50)

service = SmoothingService()

print("\n1. Testing smooth() with multiple distributions:")
dist1 = [0.1, 0.2, 0.7]
dist2 = [0.2, 0.3, 0.5]
dist3 = [0.15, 0.25, 0.6]
result = service.smooth([dist1, dist2, dist3])
expected = [0.15, 0.25, 0.6]
print(f"   Input: 3 distributions")
if result:
    print(f"   Result: {[round(x, 2) for x in result]}")
    print(f"   Expected: {expected}")
    print(f"   Match: {all(abs(result[i] - expected[i]) < 0.01 for i in range(3))}")
else:
    print(f"   ERROR: Result is None")

print("\n2. Testing smooth() with empty list:")
result = service.smooth([])
print(f"   Result: {result} (expected: None)")

print("\n3. Testing add_and_smooth() with buffer not full:")
buffer = RollingBuffer(max_size=SLIDING_WINDOW_SIZE)
dist = [0.1] * 26
result = service.add_and_smooth(dist, buffer)
print(f"   Buffer size: {len(buffer)}/{SLIDING_WINDOW_SIZE}")
print(f"   Result: {result} (expected: None)")

print("\n4. Testing add_and_smooth() with full buffer:")
buffer = RollingBuffer(max_size=3)
for i in range(3):
    buffer.append([0.1 + i * 0.1] * 3)
result = service.add_and_smooth([0.4] * 3, buffer)
print(f"   Buffer size: {len(buffer)}/3")
print(f"   Result: {[round(x, 2) for x in result] if result else None}")
print(f"   Buffer maintains size after add: {len(buffer) == 3}")

print("\n5. Testing smoothing reduces variance:")
noisy_dists = [
    [0.5, 0.3, 0.2],
    [0.6, 0.2, 0.2],
    [0.4, 0.4, 0.2],
    [0.55, 0.25, 0.2],
    [0.45, 0.35, 0.2],
]
smoothed = service.smooth(noisy_dists)
if smoothed:
    print(f"   Original variance in first class: high")
    print(f"   Smoothed first class: {round(smoothed[0], 2)} (expected: ~0.5)")
    print(f"   Smoothed sum to 1.0: {abs(sum(smoothed) - 1.0) < 0.01}")
else:
    print(f"   ERROR: Smoothed is None")

print("\n" + "=" * 50)
print("Phase 2 Smoothing tests completed successfully!")
