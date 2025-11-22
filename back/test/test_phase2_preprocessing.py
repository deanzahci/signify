import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import cv2
from services.preprocessing import PreprocessingService
from config import TOTAL_LANDMARKS, COORDS_PER_LANDMARK

print("Testing Phase 2: Preprocessing Service")
print("=" * 50)

print("\n1. Testing initialization:")
service = PreprocessingService()
print(f"   MediaPipe Hands initialized: {service.mp_hands is not None}")

print("\n2. Testing decode_jpeg with valid image:")
dummy_image = np.zeros((480, 640, 3), dtype=np.uint8)
dummy_image[100:200, 100:200] = [255, 0, 0]
success, jpeg_bytes = cv2.imencode(".jpg", dummy_image)
if success:
    decoded = service.decode_jpeg(jpeg_bytes.tobytes())
    print(f"   Decoded successfully: {decoded is not None}")
    if decoded is not None:
        print(f"   Shape: {decoded.shape}")
        print(f"   Type: {decoded.dtype}")

print("\n3. Testing decode_jpeg with invalid data:")
invalid_bytes = b"not a jpeg"
result = service.decode_jpeg(invalid_bytes)
print(f"   Invalid JPEG handled: {result is None}")

print("\n4. Testing extract_landmarks (no hands):")
blank_image = np.ones((480, 640, 3), dtype=np.uint8) * 255
result = service.extract_landmarks(blank_image)
print(f"   No hands detected: {result is None}")

print("\n5. Testing landmarks_to_array format:")
print(f"   Expected output shape: ({TOTAL_LANDMARKS}, {COORDS_PER_LANDMARK})")
print(f"   Expected landmarks: {TOTAL_LANDMARKS} (2 hands × 21 landmarks)")

print("\n6. Testing process pipeline:")
test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
success, jpeg_bytes = cv2.imencode(".jpg", test_image)
if success:
    result = service.process(jpeg_bytes.tobytes())
    if result is not None:
        print(f"   Landmarks extracted: {result.shape}")
    else:
        print(f"   No hands detected (expected for random image)")

print("\nNote: Full hand detection tests require actual hand images")
print("=" * 50)
print("Phase 2 Preprocessing tests completed!")
