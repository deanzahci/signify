"""
Metadata intake helper for MS-ASL / WLASL dataset pre-processing.

This script loads the public JSON metadata, normalizes the clip entries, and
emits a curated manifest that downstream steps (download, trimming, landmark
extraction) can consume. You can filter for a subset of classes, limit by
number of clips per class, or override the desired output path.
"""

from __future__ import annotations

import argparse
import json
import logging
import random
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Iterable, List, Mapping, Optional


DEFAULT_MANIFEST = Path("backend/data/processed/manifest.json")


@dataclass
class ClipEntry:
    label: str
    youtube_id: str
    start: float
    end: float
    signer: Optional[str] = None
    metadata: Mapping[str, Any] = None


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare metadata manifest for sign clips.")
    parser.add_argument("metadata", type=Path, help="Path to the MS-ASL/WLASL metadata JSON file.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="Output manifest path (default: backend/data/processed/manifest.json).",
    )
    parser.add_argument(
        "--max-classes",
        type=int,
        default=100,
        help="Maximum number of distinct classes to keep in the manifest.",
    )
    parser.add_argument(
        "--clips-per-class",
        type=int,
        default=50,
        help="Maximum number of clips to keep per class.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed used when sampling classes or clips.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging for troubleshooting metadata issues.",
    )
    return parser.parse_args()


def load_metadata(path: Path) -> Iterable[ClipEntry]:
    raw = json.loads(path.read_text())

    if isinstance(raw, dict):
        if "clips" in raw:
            raw = raw["clips"]
        elif "metadata" in raw:
            raw = raw["metadata"]
        else:
            raw = list(raw.values())

    if not isinstance(raw, list):
        raise ValueError("Expected the metadata JSON to be a list or a dictionary of clips.")

    entries: List[ClipEntry] = []
    for record in raw:
        youtube_id = record.get("youtube_id")
        if not youtube_id:
            url = record.get("url") or record.get("video_url")
            if isinstance(url, str) and "v=" in url:
                youtube_id = url.split("v=")[-1].split("&")[0]
        label = record.get("label") or record.get("gloss") or record.get("text") or record.get("clean_text")
        start = record.get("start_time") or record.get("start") or record.get("start_sec")
        end = record.get("end_time") or record.get("end") or record.get("end_sec")
        signer = record.get("signer") or record.get("performer")

        if not (youtube_id and label and start is not None and end is not None):
            logging.debug("Skipping incomplete metadata entry: %s", record)
            continue

        entries.append(
            ClipEntry(
                label=str(label),
                youtube_id=str(youtube_id),
                start=float(start),
                end=float(end),
                signer=str(signer) if signer is not None else None,
                metadata={k: v for k, v in record.items() if k not in {"youtube_id", "video_id", "yt_id", "id", "label", "gloss", "class", "start", "start_time", "start_sec", "end", "end_time", "end_sec", "signer", "performer"}},
            )
        )

    return entries


def sample_manifest(entries: Iterable[ClipEntry], max_classes: int, clips_per_class: int, seed: int) -> List[ClipEntry]:
    random.seed(seed)
    label_groups: dict[str, List[ClipEntry]] = {}
    for entry in entries:
        label_groups.setdefault(entry.label, []).append(entry)

    selected_labels = sorted(label_groups)
    if len(selected_labels) > max_classes:
        selected_labels = random.sample(selected_labels, max_classes)

    manifest: List[ClipEntry] = []
    for label in sorted(selected_labels):
        clips = label_groups[label]
        if len(clips) > clips_per_class:
            clips = random.sample(clips, clips_per_class)
        manifest.extend(clips)

    logging.info("Selected %d classes and %d total clips for the manifest.", len(selected_labels), len(manifest))
    return manifest


def write_manifest(entries: Iterable[ClipEntry], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = [asdict(entry) for entry in entries]
    output.write_text(json.dumps(payload, indent=2))
    logging.info("Manifest written to %s", output.resolve())


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)
    entries = load_metadata(args.metadata)
    manifest = sample_manifest(entries, args.max_classes, args.clips_per_class, args.seed)
    write_manifest(manifest, args.output)


if __name__ == "__main__":
    main()

