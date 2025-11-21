"""
Builds train/val/test datasets in `.npz` format from saved landmark sequences.
"""

from __future__ import annotations

import argparse
import json
import logging
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

import numpy as np

DEFAULT_LANDMARK_MANIFEST = Path("backend/data/processed/landmarks/manifest.json")
DEFAULT_DATASET_DIR = Path("backend/data/processed/datasets")
DEFAULT_SPLITS = (0.8, 0.1, 0.1)


@dataclass
class LandmarkRecord:
    label: str
    clip_id: str
    landmarks_path: Path
    metadata: Dict[str, any]


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build datasets from landmark npz files.")
    parser.add_argument("manifest", type=Path, nargs="?", default=DEFAULT_LANDMARK_MANIFEST, help="Landmark manifest JSON.")
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET_DIR, help="Directory to store dataset npz files.")
    parser.add_argument("--splits", type=float, nargs=3, default=DEFAULT_SPLITS, help="Train/val/test ratios (must sum to <=1).")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for shuffling.")
    parser.add_argument("--max-samples", type=int, help="Limit total records for debugging.")
    parser.add_argument("--static", action="store_true", help="Process static images (single frame) instead of video sequences.")
    parser.add_argument("--prefix", type=str, default="", help="Prefix for output dataset filenames (e.g., 'kaggle_alphabet_').")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args()


def load_manifest(path: Path, static: bool = False) -> List[LandmarkRecord]:
    if not path.exists():
        raise FileNotFoundError(f"Landmark manifest not found: {path}")
    with path.open() as fh:
        payload = json.load(fh)
    
    if static:
        # Kaggle alphabet manifest: {label, image_path, landmark_path}
        return [
            LandmarkRecord(
                label=str(record["label"]),
                clip_id=Path(record["image_path"]).stem,
                landmarks_path=Path(record["landmark_path"]),
                metadata={},
            )
            for record in payload
        ]
    else:
        # MS-ASL video manifest: {label, youtube_id, start, end, landmarks_path}
        return [
            LandmarkRecord(
                label=str(record["label"]),
                clip_id=f"{record['youtube_id']}_{record['start']}_{record['end']}",
                landmarks_path=Path(record["landmarks_path"]),
                metadata=record.get("metadata", {}),
            )
            for record in payload
        ]


def load_sequence(path: Path, static: bool = False) -> Dict[str, np.ndarray]:
    if static:
        # Load .npy file for static images (shape: [21, 3])
        landmarks = np.load(path)
        # Add temporal dimension for consistency: [1, 21, 3]
        landmarks = np.expand_dims(landmarks, axis=0)
        mask = np.ones(1, dtype=np.float32)
        return {"landmarks": landmarks, "mask": mask}
    else:
        # Load .npz file for video sequences (shape: [T, 21, 3])
        data = np.load(path)
        return {"landmarks": data["landmarks"], "mask": data["mask"]}


def split_records(records: List[LandmarkRecord], ratios: Iterable[float]) -> Dict[str, List[LandmarkRecord]]:
    train_ratio, val_ratio, test_ratio = ratios
    random.shuffle(records)
    total = len(records)
    train_end = int(train_ratio * total)
    val_end = train_end + int(val_ratio * total)
    return {
        "train": records[:train_end],
        "val": records[train_end:val_end],
        "test": records[val_end:],
    }


def assemble_split(entries: List[LandmarkRecord], label_map: Dict[str, int], static: bool = False) -> Dict[str, np.ndarray]:
    sequences = []
    masks = []
    labels = []
    clip_ids = []
    for entry in entries:
        data = load_sequence(entry.landmarks_path, static=static)
        sequences.append(data["landmarks"])
        masks.append(data["mask"])
        labels.append(label_map[entry.label])
        clip_ids.append(entry.clip_id)
    if not sequences:
        return {}
    return {
        "sequences": np.stack(sequences, axis=0),
        "masks": np.stack(masks, axis=0),
        "labels": np.array(labels, dtype=np.int64),
        "clip_ids": np.array(clip_ids, dtype=object),
    }


def write_split(split_data: Dict[str, np.ndarray], path: Path, label_map: Dict[str, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    metadata = {"label_map": label_map, "sequence_length": split_data["sequences"].shape[1]}
    np.savez_compressed(
        path,
        sequences=split_data["sequences"],
        masks=split_data["masks"],
        labels=split_data["labels"],
        clip_ids=split_data["clip_ids"],
        metadata=json.dumps(metadata),
    )
    logging.info("Saved dataset split to %s", path)


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)
    random.seed(args.seed)
    
    records = load_manifest(args.manifest, static=args.static)
    if args.max_samples:
        records = records[: args.max_samples]
    if not records:
        raise ValueError("No landmark records available to build datasets.")
    
    labels = sorted({record.label for record in records})
    label_map = {label: idx for idx, label in enumerate(labels)}
    splits = split_records(records, args.splits)
    
    mode = "static" if args.static else "video"
    logging.info("Building %s dataset splits with ratios %s", mode, args.splits)
    
    for split_name, entries in splits.items():
        split_data = assemble_split(entries, label_map, static=args.static)
        if not split_data:
            logging.warning("Skipping empty split %s", split_name)
            continue
        filename = f"{args.prefix}{split_name}.npz" if args.prefix else f"{split_name}.npz"
        target = args.dataset_dir / filename
        write_split(split_data, target, label_map)


if __name__ == "__main__":
    main()

