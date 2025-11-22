import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from services.inference import InferenceService
from config import LSTM_NUM_CLASSES, TOTAL_LANDMARKS, KEYPOINT_BUFFER_SIZE

print("Testing Phase 2: Inference Service")
print("=" * 50)

print("\n1. Testing initialization (mock mode):")
service = InferenceService()
print(f"   Mock mode: {service.mock_mode}")
print(f"   Num classes: {service.num_classes}")

print("\n2. Testing predict with empty sequence:")
result = service.predict([])
print(f"   Result length: {len(result)}")
print(f"   Expected: {LSTM_NUM_CLASSES}")
print(f"   Sum to 1.0: {abs(sum(result) - 1.0) < 0.01}")

print("\n3. Testing predict with valid sequence (mock):")
dummy_sequence = [
    np.random.rand(TOTAL_LANDMARKS, 3) for _ in range(KEYPOINT_BUFFER_SIZE)
]
result = service.predict(dummy_sequence)
print(f"   Input: {KEYPOINT_BUFFER_SIZE} frames of shape ({TOTAL_LANDMARKS}, 3)")
print(f"   Output length: {len(result)}")
print(
    f"   All probabilities equal (uniform): {all(abs(p - 1.0 / LSTM_NUM_CLASSES) < 0.001 for p in result)}"
)
print(f"   Sum to 1.0: {abs(sum(result) - 1.0) < 0.01}")

print("\n4. Testing output format:")
print(f"   Type: {type(result)}")
print(f"   First 5 values: {[round(p, 4) for p in result[:5]]}")
print(f"   All floats: {all(isinstance(p, float) for p in result)}")

print("\n5. Testing with different sequence lengths:")
short_sequence = [np.random.rand(TOTAL_LANDMARKS, 3) for _ in range(5)]
result_short = service.predict(short_sequence)
print(f"   Short sequence (5 frames): {len(result_short)} classes")
print(f"   Sum to 1.0: {abs(sum(result_short) - 1.0) < 0.01}")

print("\n" + "=" * 50)
print("Phase 2 Inference tests completed successfully!")
