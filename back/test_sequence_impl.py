"""Quick test of LSTM sequence implementation."""
import sys
sys.path.insert(0, '/Users/koichi/Projects/signify/back')

import numpy as np
from services.onnx_predictor import ONNXPredictor
from config import ONNX_MODEL_PATH, ONNX_NUM_CLASSES, ONNX_SEQUENCE_LENGTH

print(f"Testing LSTM Sequence Implementation")
print(f"=" * 50)
print(f"Model Path: {ONNX_MODEL_PATH}")
print(f"Model Exists: {ONNX_MODEL_PATH.exists()}")
print(f"Num Classes: {ONNX_NUM_CLASSES}")
print(f"Sequence Length: {ONNX_SEQUENCE_LENGTH}")
print(f"=" * 50)

# Test ONNXPredictor initialization
print("\n1. Initializing ONNXPredictor...")
predictor = ONNXPredictor()
print(f"   Mock Mode: {predictor.mock_mode}")
print(f"   Num Classes: {predictor.num_classes}")

if not predictor.mock_mode:
    model_info = predictor.get_model_info()
    print(f"   Input Shape: {model_info.get('input_shape')}")
    print(f"   Output Shape: {model_info.get('output_shape')}")

# Test _flatten_landmarks
print("\n2. Testing _flatten_landmarks()...")
landmarks = np.random.rand(21, 3).astype(np.float32)
flattened = predictor._flatten_landmarks(landmarks)
print(f"   Input shape: {landmarks.shape}")
print(f"   Output shape: {flattened.shape}")
print(f"   ✓ Flatten works!" if flattened.shape == (63,) else "   ✗ Flatten failed!")

# Test predict_sequence with random data
print("\n3. Testing predict_sequence()...")
sequence = np.random.rand(32, 21, 3).astype(np.float32)
letter, confidence = predictor.predict_sequence(sequence)
print(f"   Input shape: {sequence.shape}")
print(f"   Predicted: {letter}")
print(f"   Confidence: {confidence:.4f}")
valid_outputs = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ') + ['SPACE', 'DELETE', 'NOTHING']
print(f"   ✓ Prediction works!" if letter in valid_outputs else "   ✗ Prediction failed!")

# Test predict_sequence_distribution
print("\n4. Testing predict_sequence_distribution()...")
probs = predictor.predict_sequence_distribution(sequence)
print(f"   Output shape: {probs.shape}")
print(f"   Sum of probabilities: {np.sum(probs):.4f}")
print(f"   Max probability: {np.max(probs):.4f}")
print(f"   ✓ Distribution works!" if probs.shape == (29,) else "   ✗ Distribution failed!")

# Test metrics module
print("\n5. Testing metrics.py index_to_char()...")
from utils.metrics import index_to_char
test_cases = [
    (0, 'A'),
    (25, 'Z'),
    (26, 'SPACE'),
    (27, 'DELETE'),
    (28, 'NOTHING')
]
all_passed = True
for idx, expected in test_cases:
    result = index_to_char(idx)
    passed = result == expected
    all_passed = all_passed and passed
    status = "✓" if passed else "✗"
    print(f"   {status} index_to_char({idx}) = '{result}' (expected '{expected}')")

print(f"\n{'='*50}")
print(f"All tests passed!" if all_passed else "Some tests failed!")
print(f"{'='*50}")
