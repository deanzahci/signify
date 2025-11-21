"""
Example script demonstrating ASL inference with full softmax distribution.

This script shows how to:
1. Load a trained model checkpoint
2. Extract landmarks from an image using MediaPipe
3. Get full softmax distribution for all letters
4. Process video frames in real-time
"""

import sys
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
import torch

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.inference import ASLPredictor


def normalize_landmarks(raw: np.ndarray) -> np.ndarray:
    """Normalize landmarks to wrist origin and scale by hand size."""
    origin = raw[0]  # Wrist is landmark 0
    rel = raw - origin
    # Use distance from wrist to middle finger MCP (landmark 9) as scale
    scale = np.linalg.norm(rel[9]) if np.linalg.norm(rel[9]) > 1e-6 else np.max(np.linalg.norm(rel[1:], axis=1))
    if scale < 1e-6:
        scale = 1.0
    return rel / scale


def extract_landmarks_from_image(image_path: str) -> torch.Tensor:
    """
    Extract normalized landmarks from a single image.
    
    Args:
        image_path: Path to image file
    
    Returns:
        Tensor [1, 1, 21, 3] or None if no hand detected
    """
    mp_hands = mp.solutions.hands
    
    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.5,
    ) as hands:
        image = cv2.imread(image_path)
        if image is None:
            print(f"Failed to read image: {image_path}")
            return None
        
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)
        
        if not results.multi_hand_landmarks:
            print("No hand detected in image")
            return None
        
        # Extract 21x3 landmarks
        landmarks = np.array(
            [[lm.x, lm.y, lm.z] for lm in results.multi_hand_landmarks[0].landmark],
            dtype=np.float32
        )
        
        # Normalize
        normalized = normalize_landmarks(landmarks)
        
        # Convert to tensor [1, 1, 21, 3]
        tensor = torch.from_numpy(normalized).unsqueeze(0).unsqueeze(0)
        return tensor


def extract_landmarks_from_frame(frame: np.ndarray, hands) -> torch.Tensor:
    """
    Extract landmarks from a video frame (for real-time processing).
    
    Args:
        frame: BGR image from cv2.VideoCapture
        hands: MediaPipe Hands instance (reused across frames)
    
    Returns:
        Tensor [1, 1, 21, 3] or None if no hand detected
    """
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb)
    
    if not results.multi_hand_landmarks:
        return None
    
    landmarks = np.array(
        [[lm.x, lm.y, lm.z] for lm in results.multi_hand_landmarks[0].landmark],
        dtype=np.float32
    )
    
    normalized = normalize_landmarks(landmarks)
    tensor = torch.from_numpy(normalized).unsqueeze(0).unsqueeze(0)
    return tensor


def example_1_single_image():
    """Example 1: Predict from a single image with full distribution."""
    print("=" * 60)
    print("Example 1: Single Image Prediction with Full Distribution")
    print("=" * 60)
    
    # Load model
    checkpoint_path = "backend/models/checkpoints/mlp_epoch10_acc0.950.pt"
    predictor = ASLPredictor(checkpoint_path)
    
    print(f"\nLoaded model: {predictor.architecture}")
    print(f"Device: {predictor.device}")
    print(f"Number of classes: {predictor.num_classes}")
    
    # Extract landmarks from image
    image_path = "test_images/letter_A.jpg"
    landmarks = extract_landmarks_from_image(image_path)
    
    if landmarks is None:
        print("Failed to extract landmarks")
        return
    
    # Get full softmax distribution
    distribution = predictor.predict_distribution(landmarks)
    
    print(f"\n{'Letter':<10} {'Confidence':<12} {'Bar'}")
    print("-" * 50)
    for pred in distribution:
        bar = "█" * int(pred["confidence"] * 50)
        print(f"{pred['letter']:<10} {pred['confidence']:.6f}     {bar}")


def example_2_top_k():
    """Example 2: Get only top-5 predictions."""
    print("\n" + "=" * 60)
    print("Example 2: Top-5 Predictions")
    print("=" * 60)
    
    checkpoint_path = "backend/models/checkpoints/mlp_epoch10_acc0.950.pt"
    predictor = ASLPredictor(checkpoint_path)
    
    image_path = "test_images/letter_B.jpg"
    landmarks = extract_landmarks_from_image(image_path)
    
    if landmarks is None:
        return
    
    # Get top-5 predictions
    top_5 = predictor.predict_top_k(landmarks, k=5)
    
    print("\nTop 5 predictions:")
    for i, pred in enumerate(top_5, 1):
        print(f"{i}. {pred['letter']}: {pred['confidence']:.4f}")


def example_3_single_prediction():
    """Example 3: Get only the most likely letter."""
    print("\n" + "=" * 60)
    print("Example 3: Single Best Prediction")
    print("=" * 60)
    
    checkpoint_path = "backend/models/checkpoints/mlp_epoch10_acc0.950.pt"
    predictor = ASLPredictor(checkpoint_path)
    
    image_path = "test_images/letter_C.jpg"
    landmarks = extract_landmarks_from_image(image_path)
    
    if landmarks is None:
        return
    
    # Get single prediction
    prediction = predictor.predict_single(landmarks)
    
    print(f"\nPredicted letter: {prediction['letter']}")
    print(f"Confidence: {prediction['confidence']:.4f}")


def example_4_realtime_video():
    """Example 4: Real-time video processing with webcam."""
    print("\n" + "=" * 60)
    print("Example 4: Real-time Video Processing")
    print("=" * 60)
    print("Press 'q' to quit")
    
    checkpoint_path = "backend/models/checkpoints/mlp_epoch10_acc0.950.pt"
    predictor = ASLPredictor(checkpoint_path)
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    
    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as hands:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            # Extract landmarks
            landmarks = extract_landmarks_from_frame(frame, hands)
            
            if landmarks is not None:
                # Get top-3 predictions
                top_3 = predictor.predict_top_k(landmarks, k=3)
                
                # Display predictions on frame
                y_offset = 30
                for i, pred in enumerate(top_3):
                    text = f"{pred['letter']}: {pred['confidence']:.3f}"
                    cv2.putText(
                        frame,
                        text,
                        (10, y_offset + i * 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0),
                        2,
                    )
            else:
                cv2.putText(
                    frame,
                    "No hand detected",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 0, 255),
                    2,
                )
            
            cv2.imshow("ASL Recognition", frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    cap.release()
    cv2.destroyAllWindows()


def example_5_batch_processing():
    """Example 5: Process multiple images in a batch."""
    print("\n" + "=" * 60)
    print("Example 5: Batch Processing")
    print("=" * 60)
    
    checkpoint_path = "backend/models/checkpoints/mlp_epoch10_acc0.950.pt"
    predictor = ASLPredictor(checkpoint_path)
    
    # Extract landmarks from multiple images
    image_paths = [
        "test_images/letter_A.jpg",
        "test_images/letter_B.jpg",
        "test_images/letter_C.jpg",
    ]
    
    landmarks_list = []
    for img_path in image_paths:
        landmarks = extract_landmarks_from_image(img_path)
        if landmarks is not None:
            landmarks_list.append(landmarks)
    
    if not landmarks_list:
        print("No valid landmarks extracted")
        return
    
    # Stack into batch [batch_size, 1, 21, 3]
    batch = torch.cat(landmarks_list, dim=0)
    
    # Predict batch
    results = predictor.predict_batch(batch)
    
    print(f"\nProcessed {len(results)} images:")
    for i, distribution in enumerate(results):
        top_pred = distribution[0]
        print(f"Image {i+1}: {top_pred['letter']} ({top_pred['confidence']:.4f})")


if __name__ == "__main__":
    # Run examples (comment out examples you don't want to run)
    
    try:
        example_1_single_image()
    except Exception as e:
        print(f"Example 1 failed: {e}")
    
    try:
        example_2_top_k()
    except Exception as e:
        print(f"Example 2 failed: {e}")
    
    try:
        example_3_single_prediction()
    except Exception as e:
        print(f"Example 3 failed: {e}")
    
    # Uncomment to run real-time video example
    # try:
    #     example_4_realtime_video()
    # except Exception as e:
    #     print(f"Example 4 failed: {e}")
    
    try:
        example_5_batch_processing()
    except Exception as e:
        print(f"Example 5 failed: {e}")

