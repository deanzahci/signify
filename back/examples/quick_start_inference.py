"""
Quick Start: ASL Letter Recognition with Full Softmax Distribution

This is the simplest example for teammates to get started with inference.
It shows exactly what your teammate requested:
- Takes PyTorch Tensor data as input
- Returns the letter detected with confidence score for EACH alphabet

Usage:
    python examples/quick_start_inference.py
"""

import sys
from pathlib import Path

import torch

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.inference import ASLPredictor


def main():
    """
    Demonstrates the exact API your teammate requested:
    - Input: PyTorch Tensor (landmarks)
    - Output: Full distribution with letter + confidence for each alphabet
    """
    
    # Step 1: Load the trained model
    checkpoint_path = "backend/models/checkpoints/mlp_epoch10_acc0.950.pt"
    predictor = ASLPredictor(checkpoint_path)
    
    print("=" * 70)
    print("ASL Letter Recognition - Full Softmax Distribution")
    print("=" * 70)
    print(f"\nModel loaded: {predictor.architecture}")
    print(f"Number of classes: {predictor.num_classes}")
    print(f"Device: {predictor.device}")
    
    # Step 2: Create sample input (PyTorch Tensor)
    # In real usage, this would come from MediaPipe landmark extraction
    # Shape: [batch_size=1, sequence_length=1, num_landmarks=21, coords=3]
    landmarks_tensor = torch.randn(1, 1, 21, 3)
    
    print(f"\nInput shape: {landmarks_tensor.shape}")
    print(f"Input type: {type(landmarks_tensor)}")
    
    # Step 3: Get full softmax distribution
    # This returns confidence scores for EVERY letter
    distribution = predictor.predict_distribution(landmarks_tensor)
    
    # Step 4: Display results
    print("\n" + "=" * 70)
    print("FULL SOFTMAX DISTRIBUTION (All Letters with Confidence Scores)")
    print("=" * 70)
    print(f"\n{'Rank':<6} {'Letter':<10} {'Confidence':<15} {'Probability Bar'}")
    print("-" * 70)
    
    for rank, pred in enumerate(distribution, 1):
        letter = pred['letter']
        confidence = pred['confidence']
        bar = "█" * int(confidence * 50)
        print(f"{rank:<6} {letter:<10} {confidence:.8f}     {bar}")
    
    # Step 5: Show how to extract specific information
    print("\n" + "=" * 70)
    print("USAGE EXAMPLES")
    print("=" * 70)
    
    # Top prediction
    top_pred = distribution[0]
    print(f"\n1. Most likely letter:")
    print(f"   Letter: {top_pred['letter']}")
    print(f"   Confidence: {top_pred['confidence']:.4f}")
    
    # Top 5 predictions
    print(f"\n2. Top 5 predictions:")
    for i, pred in enumerate(distribution[:5], 1):
        print(f"   {i}. {pred['letter']}: {pred['confidence']:.4f}")
    
    # Access specific letter confidence
    print(f"\n3. Get confidence for specific letter (e.g., 'A'):")
    letter_a_conf = next((p['confidence'] for p in distribution if p['letter'] == 'A'), None)
    if letter_a_conf is not None:
        print(f"   Confidence for 'A': {letter_a_conf:.4f}")
    
    # Convert to dictionary for easy lookup
    print(f"\n4. Convert to dictionary for O(1) lookup:")
    conf_dict = {pred['letter']: pred['confidence'] for pred in distribution}
    print(f"   conf_dict['B'] = {conf_dict.get('B', 0):.4f}")
    print(f"   conf_dict['C'] = {conf_dict.get('C', 0):.4f}")
    
    print("\n" + "=" * 70)
    print("INTEGRATION TEMPLATE FOR YOUR TEAMMATE")
    print("=" * 70)
    print("""
# Load model once at startup
predictor = ASLPredictor('path/to/checkpoint.pt')

# In your inference loop:
def recognize_letter(landmarks_tensor):
    '''
    Args:
        landmarks_tensor: torch.Tensor [1, 1, 21, 3]
    
    Returns:
        List of dicts: [
            {'letter': 'A', 'confidence': 0.85},
            {'letter': 'B', 'confidence': 0.03},
            ...
        ]
    '''
    return predictor.predict_distribution(landmarks_tensor)

# Use it:
distribution = recognize_letter(landmarks_tensor)
top_letter = distribution[0]['letter']
top_confidence = distribution[0]['confidence']
print(f"Detected: {top_letter} ({top_confidence:.2%})")
""")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        print(f"\nError: {e}")
        print("\nNote: This example requires a trained model checkpoint.")
        print("Train a model first using:")
        print("  python src/train/train_model.py --dataset kaggle_alphabet_train.npz --architecture mlp")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

