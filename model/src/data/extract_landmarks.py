"""
Extracts MediaPipe hand landmarks for each trimmed clip and stores
normalized, fixed-length sequences for downstream training.
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import cv2
import mediapipe as mp
import numpy as np

DEFAULT_MANIFEST = Path("backend/data/processed/manifest_trimmed.json")
DEFAULT_LANDMARK_ROOT = Path("backend/data/processed/landmarks")
DEFAULT_LANDMARK_MANIFEST = DEFAULT_LANDMARK_ROOT / "manifest.json"
NUM_LANDMARKS = 21


@dataclass
class ClipEntry:
    label: str
    youtube_id: str
    start: float
    end: float
    signer: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    trimmed_path: Optional[str] = None


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract MediaPipe landmarks from trimmed clips.")
    parser.add_argument("manifest", type=Path, nargs="?", default=DEFAULT_MANIFEST, help="Trimmed manifest JSON.")
    parser.add_argument("--landmark-root", type=Path, default=DEFAULT_LANDMARK_ROOT, help="Directory to store landmark npz files.")
    parser.add_argument("--sequence-length", type=int, default=64, help="Fixed sequence length (frames).")
    parser.add_argument("--min-detection-confidence", type=float, default=0.5, help="MediaPipe detection confidence.")
    parser.add_argument("--min-tracking-confidence", type=float, default=0.5, help="MediaPipe tracking confidence.")
    parser.add_argument("--frame-skip", type=int, default=1, help="Process every Nth frame.")
    parser.add_argument("--dry-run", action="store_true", help="Only log without writing landmarks.")
    parser.add_argument("--resume", action="store_true", help="Skip already-extracted clips.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args()


def load_manifest(path: Path) -> List[ClipEntry]:
    if not path.exists():
        raise FileNotFoundError(f"Trimmed manifest missing: {path}")

    with path.open() as fh:
        payload = json.load(fh)

    entries: List[ClipEntry] = []
    for record in payload:
        entries.append(
            ClipEntry(
                label=str(record["label"]),
                youtube_id=str(record["youtube_id"]),
                start=float(record["start"]),
                end=float(record["end"]),
                signer=record.get("signer"),
                metadata=record.get("metadata", {}),
                trimmed_path=record.get("trimmed_path"),
            )
        )
    return entries


def manifest_key(entry: ClipEntry) -> str:
    return f"{entry.youtube_id}_{entry.start}_{entry.end}"


def sanitize_label(label: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "_-" else "_" for ch in label)


def build_landmark_path(entry: ClipEntry, root: Path) -> Path:
    label_dir = root / sanitize_label(entry.label)
    label_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{entry.youtube_id}_{entry.start:.2f}_{entry.end:.2f}.npz"
    return label_dir / filename


def normalize_landmarks(raw: np.ndarray) -> np.ndarray:
    origin = raw[0]
    rel = raw - origin
    scale = np.linalg.norm(rel[9]) if np.linalg.norm(rel[9]) > 1e-6 else np.max(np.linalg.norm(rel[1:], axis=1))
    if scale < 1e-6:
        scale = 1.0
    return rel / scale


def pad_sequence(sequence: np.ndarray, length: int) -> tuple[np.ndarray, np.ndarray]:
    frames = sequence.shape[0]
    mask = np.zeros(length, dtype=np.bool_)
    if frames >= length:
        mask[:] = True
        return sequence[:length], mask
    mask[:frames] = True
    fill = np.zeros((length - frames, NUM_LANDMARKS, 3), dtype=np.float32)
    return np.concatenate([sequence, fill], axis=0), mask


def process_clip(entry: ClipEntry, args: argparse.Namespace) -> Optional[Dict[str, Any]]:
    if not entry.trimmed_path:
        logging.warning("Missing trimmed_path for %s", entry.youtube_id)
        return None
    trimmed_path = Path(entry.trimmed_path)
    if not trimmed_path.exists():
        logging.warning("Trimmed clip missing: %s", trimmed_path)
        return None

    cap = cv2.VideoCapture(str(trimmed_path))
    if not cap.isOpened():
        logging.warning("Cannot open clip: %s", trimmed_path)
        return None

    mp_hands = mp.solutions.hands
    results_list: List[np.ndarray] = []
    frame_index = 0

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=args.min_detection_confidence,
        min_tracking_confidence=args.min_tracking_confidence,
    ) as hands:
        while True:
            success, frame = cap.read()
            if not success:
                break
            if frame_index % args.frame_skip != 0:
                frame_index += 1
                continue
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            if results.multi_hand_landmarks:
                lm = results.multi_hand_landmarks[0]
                coords = np.array([[pt.x, pt.y, pt.z] for pt in lm.landmark], dtype=np.float32)
                normalized = normalize_landmarks(coords)
                results_list.append(normalized)
            frame_index += 1

    cap.release()

    if not results_list:
        logging.warning("No hands detected in %s", trimmed_path)
        return None

    sequence = np.stack(results_list, axis=0)
    padded, mask = pad_sequence(sequence, args.sequence_length)
    mask = mask.astype(np.float32)

    metadata = {
        "label": entry.label,
        "youtube_id": entry.youtube_id,
        "start": entry.start,
        "end": entry.end,
        "signer": entry.signer,
        "trimmed_path": entry.trimmed_path,
        "sequence_length": args.sequence_length,
    }
    return {
        "entry": entry,
        "landmarks": padded,
        "mask": mask,
        "metadata": metadata,
    }


def write_landmark_record(record: Dict[str, Any], args: argparse.Namespace) -> Path:
    path = build_landmark_path(record["entry"], args.landmark_root)
    np.savez_compressed(path, landmarks=record["landmarks"], mask=record["mask"], metadata=record["metadata"])
    logging.debug("Saved landmarks to %s", path)
    return path


def write_manifest(records: Iterable[Dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    manifest = []
    for rec in records:
        manifest.append(
            {
                "label": rec["metadata"]["label"],
                "youtube_id": rec["metadata"]["youtube_id"],
                "start": rec["metadata"]["start"],
                "end": rec["metadata"]["end"],
                "landmarks_path": str(rec["path"]),
                "metadata": rec["metadata"],
            }
        )
    path.write_text(json.dumps(manifest, indent=2))
    logging.info("Wrote landmark manifest to %s", path)


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)
    entries = load_manifest(args.manifest)

    existing_records: List[Dict[str, Any]] = []
    seen_keys: Dict[str, Dict[str, Any]] = {}
    if args.resume and DEFAULT_LANDMARK_MANIFEST.exists():
        with DEFAULT_LANDMARK_MANIFEST.open() as fh:
            for record in json.load(fh):
                key = f"{record['youtube_id']}_{record['start']}_{record['end']}"
                seen_keys[key] = record
                existing_records.append(record)

    extracted: List[Dict[str, Any]] = []
    for entry in entries:
        key = manifest_key(entry)
        if args.resume and key in seen_keys:
            logging.debug("Skipping already extracted %s", key)
            continue
        result = process_clip(entry, args)
        if result is None:
            continue
        if args.dry_run:
            logging.info("Dry run: processed %s", entry.youtube_id)
            continue
        path = write_landmark_record(result, args)
        result["path"] = path
        extracted.append(result)

    if args.dry_run:
        logging.info("Dry run complete.")
        return

    final_manifest: List[Dict[str, Any]] = existing_records[:]
    for record in extracted:
        final_manifest.append(
            {
                "label": record["metadata"]["label"],
                "youtube_id": record["metadata"]["youtube_id"],
                "start": record["metadata"]["start"],
                "end": record["metadata"]["end"],
                "landmarks_path": str(record["path"]),
                "metadata": record["metadata"],
            }
        )
    if final_manifest:
        write_manifest(final_manifest, DEFAULT_LANDMARK_MANIFEST)
    else:
        logging.info("No landmark records to write.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning("Interrupted.")
        sys.exit(1)

