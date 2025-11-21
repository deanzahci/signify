"""
Trim downloaded clips down to labeled start/end timestamps via ffmpeg.

This script assumes downloads follow the deterministic file naming from
`download_msasl.py`. Optional resume mode skips already-trimmed clips, reducing
waste when re-running the pipeline.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import logging
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

DEFAULT_MANIFEST = Path("backend/data/processed/manifest_downloaded.json")
DEFAULT_TRIM_ROOT = Path("backend/data/processed/clips")
DEFAULT_OUTPUT_MANIFEST = Path("backend/data/processed/manifest_trimmed.json")


@dataclass
class ClipEntry:
    label: str
    youtube_id: str
    start: float
    end: float
    signer: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw_path: Optional[str] = None
    trimmed_path: Optional[str] = None


@dataclass
class TrimResult:
    entry: ClipEntry
    path: Path
    status: str
    message: str
    duration: float
    stderr: str


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Trim downloaded clips with ffmpeg.")
    parser.add_argument("manifest", type=Path, nargs="?", default=DEFAULT_MANIFEST, help="Input manifest with raw_path entries.")
    parser.add_argument("--trim-root", type=Path, default=DEFAULT_TRIM_ROOT, help="Directory for trimmed clips.")
    parser.add_argument("--raw-root", type=Path, default=Path("backend/data/raw"), help="Directory containing raw downloads.")
    parser.add_argument("--output-manifest", type=Path, default=DEFAULT_OUTPUT_MANIFEST, help="Manifest for trimmed clips.")
    parser.add_argument("--concurrency", type=int, default=2, help="Number of concurrent ffmpeg jobs.")
    parser.add_argument("--timeout", type=int, default=120, help="Per-trim job timeout in seconds.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing trimmed clips.")
    parser.add_argument("--dry-run", action="store_true", help="Print commands without running ffmpeg.")
    parser.add_argument("--sample", type=int, help="Only process the first N clips.")
    parser.add_argument("--resume", action="store_true", help="Skip already-trimmed clips.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args()


def load_manifest(path: Path) -> List[ClipEntry]:
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
                raw_path=record.get("raw_path"),
                trimmed_path=record.get("trimmed_path"),
            )
        )
    return entries


def canonical_basename(entry: ClipEntry) -> str:
    return f"{entry.youtube_id}_{entry.start:.2f}_{entry.end:.2f}.mp4"


def default_raw_path(entry: ClipEntry, root: Path) -> Path:
    safe_label = entry.label.replace("/", "_")
    return root / safe_label / canonical_basename(entry)


def trim_target(entry: ClipEntry, root: Path) -> Path:
    safe_label = entry.label.replace("/", "_")
    return root / safe_label / canonical_basename(entry)


def manifest_key(entry: ClipEntry) -> str:
    return f"{entry.youtube_id}_{entry.start}_{entry.end}"


def run_trim(entry: ClipEntry, args: argparse.Namespace) -> TrimResult:
    target_path = trim_target(entry, args.trim_root)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    if target_path.exists() and not args.overwrite:
        message = "Skipped: already trimmed"
        logging.info(message + " %s", target_path)
        return TrimResult(entry=entry, path=target_path, status="skipped", message=message, duration=0.0, stderr="")

    if entry.end <= entry.start:
        message = "Invalid timestamps (end <= start)"
        logging.warning(message + " for %s", entry.youtube_id)
        return TrimResult(entry=entry, path=target_path, status="invalid", message=message, duration=0.0, stderr="")

    raw_path = Path(entry.raw_path) if entry.raw_path else default_raw_path(entry, args.raw_root)
    if not raw_path.exists():
        message = f"Missing raw file: {raw_path}"
        logging.warning(message)
        return TrimResult(entry=entry, path=target_path, status="failed", message=message, duration=0.0, stderr="")

    duration = entry.end - entry.start
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y" if args.overwrite else "-n",
        "-ss",
        str(entry.start),
        "-i",
        str(raw_path),
        "-t",
        f"{duration:.3f}",
        "-c",
        "copy",
        "-avoid_negative_ts",
        "make_zero",
        str(target_path),
    ]

    if args.dry_run:
        logging.info("[dry-run] %s", " ".join(cmd))
        return TrimResult(entry=entry, path=target_path, status="dry-run", message="command simulated", duration=0.0, stderr="")

    start_time = time.time()
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=args.timeout)
    elapsed = time.time() - start_time
    if proc.returncode == 0:
        entry.trimmed_path = str(target_path)
        logging.info("Trimmed %s -> %s", entry.youtube_id, target_path)
        return TrimResult(entry=entry, path=target_path, status="success", message="trimmed", duration=elapsed, stderr=proc.stderr.strip())

    message = f"ffmpeg failed (code {proc.returncode})"
    logging.warning("%s %s: %s", message, entry.youtube_id, proc.stderr.splitlines()[-1] if proc.stderr else "")
    return TrimResult(entry=entry, path=target_path, status="failed", message=message, duration=elapsed, stderr=proc.stderr.strip())


def read_existing_manifest(path: Path) -> Dict[str, ClipEntry]:
    existing: Dict[str, ClipEntry] = {}
    if not path.exists():
        return existing
    with path.open() as fh:
        payload = json.load(fh)
    for record in payload:
        entry = ClipEntry(
            label=str(record["label"]),
            youtube_id=str(record["youtube_id"]),
            start=float(record["start"]),
            end=float(record["end"]),
            signer=record.get("signer"),
            metadata=record.get("metadata", {}),
            raw_path=record.get("raw_path"),
            trimmed_path=record.get("trimmed_path"),
        )
        existing[manifest_key(entry)] = entry
    return existing


def write_manifest(entries: Iterable[ClipEntry], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = []
    for entry in entries:
        payload.append(
            {
                "label": entry.label,
                "youtube_id": entry.youtube_id,
                "start": entry.start,
                "end": entry.end,
                "signer": entry.signer,
                "metadata": entry.metadata,
                "raw_path": entry.raw_path,
                "trimmed_path": entry.trimmed_path,
            }
        )
    path.write_text(json.dumps(payload, indent=2))
    logging.info("Wrote trim manifest to %s", path)


def write_log(results: Sequence[TrimResult], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as fh:
        for result in results:
            fh.write(json.dumps({"status": result.status, "path": str(result.path), "duration": result.duration, "message": result.message, "stderr": result.stderr}) + "\n")


def summarize(results: Sequence[TrimResult]) -> None:
    success = sum(1 for res in results if res.status == "success")
    skipped = sum(1 for res in results if res.status == "skipped")
    invalid = sum(1 for res in results if res.status == "invalid")
    failed = sum(1 for res in results if res.status == "failed")
    dry_run = sum(1 for res in results if res.status == "dry-run")
    logging.info(
        "Trim summary: success=%d skipped=%d invalid=%d failed=%d dry-run=%d",
        success,
        skipped,
        invalid,
        failed,
        dry_run,
    )


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)

    entries = load_manifest(args.manifest)
    if args.sample:
        entries = entries[: args.sample]

    existing_entries = read_existing_manifest(args.output_manifest)
    if args.resume and existing_entries:
        entries = [entry for entry in entries if manifest_key(entry) not in existing_entries]
        logging.info("Resuming trimming; %d entries remaining", len(entries))

    results: List[TrimResult] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        future_to_entry = {executor.submit(run_trim, entry, args): entry for entry in entries}
        for future in concurrent.futures.as_completed(future_to_entry):
            entry = future_to_entry[future]
            try:
                result = future.result()
            except Exception as exc:  # pragma: no cover
                logging.exception("Trimming failed for %s", entry.youtube_id)
                target = trim_target(entry, args.trim_root)
                result = TrimResult(entry=entry, path=target, status="failed", message=str(exc), duration=0.0, stderr=str(exc))
            results.append(result)

    if args.dry_run:
        logging.info("Dry run complete; no trims were written.")
        return

    log_path = args.trim_root / "trim_log.jsonl"
    write_log(results, log_path)
    summarize(results)
    final_entries = dict(existing_entries)
    for res in results:
        if res.entry.trimmed_path:
            final_entries[manifest_key(res.entry)] = res.entry
    write_manifest(final_entries.values(), args.output_manifest)
    for res in results:
        if res.status == "success":
            logging.debug("Trimmed %s -> %s", res.entry.youtube_id, res.path)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning("Interrupted by user.")
        sys.exit(1)

