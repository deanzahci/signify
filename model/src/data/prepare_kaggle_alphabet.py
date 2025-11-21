"""
Prepare Kaggle ASL Alphabet dataset for training.

This script processes static images from the Kaggle ASL Alphabet dataset,
extracts MediaPipe hand landmarks, normalizes them, and writes a manifest
linking each image to its landmarks file. Unlike video-based MS-ASL processing,
this operates on single frames (static images) for letter classification.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import mediapipe as mp
import numpy as np

DEFAULT_INPUT_DIR = Path("/Users/an/daHacks/trainingData/archive/asl_alphabet_train/asl_alphabet_train")
DEFAULT_OUTPUT_ROOT = Path("backend/data/processed/kaggle_alphabet")
DEFAULT_MANIFEST = DEFAULT_OUTPUT_ROOT / "manifest_kaggle_alphabet.json"
NUM_LANDMARKS = 21


@dataclass
class ImageEntry:
    label: str
    image_path: str
    landmark_path: Optional[str] = None
    detection_success: bool = False


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract landmarks from Kaggle ASL Alphabet images.")
    parser.add_argument(
        "input_dir",
        type=Path,
        nargs="?",
        default=DEFAULT_INPUT_DIR,
        help="Directory containing label subdirectories (e.g., A/, B/, ...).",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help="Root directory for landmarks and manifest.",
    )
    parser.add_argument(
        "--output-manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="Output manifest JSON path.",
    )
    parser.add_argument(
        "--min-detection-confidence",
        type=float,
        default=0.5,
        help="MediaPipe detection confidence threshold.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip images that already have landmarks.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log actions without writing files.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging.",
    )
    return parser.parse_args()


def discover_images(input_dir: Path) -> List[ImageEntry]:
    """Discover all images organized by label subdirectories."""
    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory not found: {input_dir}")

    entries: List[ImageEntry] = []
    for label_dir in sorted(input_dir.iterdir()):
        if not label_dir.is_dir():
            continue
        label = label_dir.name
        for img_path in sorted(label_dir.glob("*.jpg")) + sorted(label_dir.glob("*.png")):
            entries.append(ImageEntry(label=label, image_path=str(img_path.resolve())))

    logging.info("Discovered %d images across %d labels.", len(entries), len(set(e.label for e in entries)))
    return entries


def normalize_landmarks(raw: np.ndarray) -> np.ndarray:
    """Normalize landmarks to wrist origin and scale by hand size."""
    origin = raw[0]  # Wrist is landmark 0
    rel = raw - origin
    # Use distance from wrist to middle finger MCP (landmark 9) as scale
    scale = np.linalg.norm(rel[9]) if np.linalg.norm(rel[9]) > 1e-6 else np.max(np.linalg.norm(rel[1:], axis=1))
    if scale < 1e-6:
        scale = 1.0
    return rel / scale


def build_landmark_path(entry: ImageEntry, output_root: Path) -> Path:
    """Build output path for landmark .npy file."""
    label_dir = output_root / "landmarks" / entry.label
    label_dir.mkdir(parents=True, exist_ok=True)
    img_name = Path(entry.image_path).stem
    return label_dir / f"{img_name}.npy"


def process_image(entry: ImageEntry, hands, args: argparse.Namespace) -> ImageEntry:
    """Extract landmarks from a single image using MediaPipe."""
    image = cv2.imread(entry.image_path)
    if image is None:
        logging.warning("Failed to read image: %s", entry.image_path)
        return entry

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb)

    if not results.multi_hand_landmarks:
        logging.debug("No hand detected in %s", entry.image_path)
        return entry

    # Extract first detected hand (max_num_hands=1 ensures only one)
    hand_landmarks = results.multi_hand_landmarks[0]
    coords = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark], dtype=np.float32)
    normalized = normalize_landmarks(coords)

    # Save landmarks
    landmark_path = build_landmark_path(entry, args.output_root)
    if not args.dry_run:
        np.save(landmark_path, normalized)

    entry.landmark_path = str(landmark_path.resolve())
    entry.detection_success = True
    return entry


def write_manifest(entries: List[ImageEntry], output_path: Path) -> None:
    """Write manifest JSON linking images to landmarks."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [asdict(e) for e in entries if e.detection_success]
    with output_path.open("w") as fh:
        json.dump(payload, fh, indent=2)
    logging.info("Wrote manifest with %d successful entries to %s", len(payload), output_path)


def load_existing_manifest(path: Path) -> Dict[str, ImageEntry]:
    """Load existing manifest for resume functionality."""
    if not path.exists():
        return {}
    with path.open() as fh:
        payload = json.load(fh)
    return {e["image_path"]: ImageEntry(**e) for e in payload}


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)

    entries = discover_images(args.input_dir)
    if not entries:
        logging.error("No images found in %s", args.input_dir)
        sys.exit(1)

    existing = load_existing_manifest(args.output_manifest)
    if args.resume:
        entries = [e for e in entries if e.image_path not in existing]
        logging.info("Resuming: %d images remaining after skipping existing.", len(entries))

    mp_hands = mp.solutions.hands
    results: List[ImageEntry] = []

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=args.min_detection_confidence,
    ) as hands:
        for idx, entry in enumerate(entries, start=1):
            if idx % 100 == 0:
                logging.info("Processed %d / %d images...", idx, len(entries))
            processed = process_image(entry, hands, args)
            results.append(processed)

    # Merge with existing entries
    all_entries = list(existing.values()) + results
    success_count = sum(1 for e in all_entries if e.detection_success)
    fail_count = len(all_entries) - success_count

    logging.info("Processing complete: %d successful, %d failed.", success_count, fail_count)

    if not args.dry_run:
        write_manifest(all_entries, args.output_manifest)
    else:
        logging.info("Dry run complete; no files written.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning("Interrupted by user.")
        sys.exit(1)

