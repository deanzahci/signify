"""
Drive yt-dlp downloads based on the normalized MS-ASL/WLASL manifest.

Each manifest entry is fetched into `backend/data/raw/<label>/` with a
deterministic filename based on the YouTube ID and clip timestamps. Successful
downloads are recorded in an enriched manifest that the trimming step can
consume.
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
from typing import Any, Dict, List, Optional, Sequence

DEFAULT_MANIFEST = Path("backend/data/processed/manifest.json")
DEFAULT_DOWNLOAD_ROOT = Path("backend/data/raw")
DEFAULT_OUTPUT_MANIFEST = Path("backend/data/processed/manifest_downloaded.json")

@dataclass
class ClipEntry:
    label: str
    youtube_id: str
    start: float
    end: float
    signer: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw_path: Optional[str] = None


@dataclass
class DownloadResult:
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
    parser = argparse.ArgumentParser(description="Download MS-ASL/WLASL clips via yt-dlp.")
    parser.add_argument("manifest", type=Path, nargs="?", default=DEFAULT_MANIFEST, help="Path to the normalized manifest JSON.")
    parser.add_argument("--download-root", type=Path, default=DEFAULT_DOWNLOAD_ROOT, help="Directory to store raw downloads.")
    parser.add_argument("--output-manifest", type=Path, default=DEFAULT_OUTPUT_MANIFEST, help="Path to write the downloaded manifest.")
    parser.add_argument("--concurrency", type=int, default=4, help="Number of concurrent yt-dlp workers.")
    parser.add_argument("--format", default="bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4", help="yt-dlp format selector.")
    parser.add_argument("--timeout", type=int, default=300, help="Per-download timeout in seconds.")
    parser.add_argument("--overwrite", action="store_true", help="Re-download even if the target already exists.")
    parser.add_argument("--dry-run", action="store_true", help="Print commands without executing.")
    parser.add_argument("--sample", type=int, help="Only download the first N entries.")
    parser.add_argument("--resume", action="store_true", help="Skip entries that were already downloaded.")
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
            )
        )
    return entries


def canonical_basename(entry: ClipEntry) -> str:
    return f"{entry.youtube_id}_{entry.start:.2f}_{entry.end:.2f}.mp4"


def download_target(entry: ClipEntry, root: Path) -> Path:
    safe_label = entry.label.replace("/", "_")
    return root / safe_label / canonical_basename(entry)


def build_video_url(entry: ClipEntry) -> str:
    metadata_url = entry.metadata.get("url")
    if metadata_url:
        return str(metadata_url)
    return f"https://www.youtube.com/watch?v={entry.youtube_id}"


def run_download(entry: ClipEntry, args: argparse.Namespace) -> DownloadResult:
    target_path = download_target(entry, args.download_root)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    if target_path.exists() and not args.overwrite:
        message = "Skipped: already exists"
        logging.info(message + " %s", target_path)
        return DownloadResult(entry=entry, path=target_path, status="skipped", message=message, duration=0.0, stderr="")

    url = build_video_url(entry)
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "--no-check-certificate",
        "--output",
        str(target_path),
        "--format",
        args.format,
        url,
    ]
    if args.dry_run:
        logging.info("[dry-run] %s", " ".join(cmd))
        return DownloadResult(entry=entry, path=target_path, status="dry-run", message="command simulated", duration=0.0, stderr="")

    start_time = time.time()
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=args.timeout)
    duration = time.time() - start_time
    if proc.returncode == 0:
        entry.raw_path = str(target_path)
        logging.info("Downloaded %s to %s", entry.youtube_id, target_path)
        return DownloadResult(entry=entry, path=target_path, status="success", message="downloaded", duration=duration, stderr=proc.stderr.strip())

    message = f"yt-dlp failed (code {proc.returncode})"
    logging.warning("%s %s: %s", message, entry.youtube_id, proc.stderr.splitlines()[-1] if proc.stderr else "")
    return DownloadResult(entry=entry, path=target_path, status="failed", message=message, duration=duration, stderr=proc.stderr.strip())


def manifest_key(entry: ClipEntry) -> str:
    return f"{entry.youtube_id}_{entry.start}_{entry.end}"


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
        )
        key = manifest_key(entry)
        existing[key] = ClipEntry(
            label=entry.label,
            youtube_id=entry.youtube_id,
            start=entry.start,
            end=entry.end,
            signer=entry.signer,
            metadata=entry.metadata,
            raw_path=entry.raw_path,
        )
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
            }
        )
    path.write_text(json.dumps(payload, indent=2))
    logging.info("Wrote download manifest to %s", path)


def write_log(results: Sequence[DownloadResult], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as fh:
        for result in results:
            fh.write(json.dumps({"status": result.status, "path": str(result.path), "duration": result.duration, "message": result.message, "stderr": result.stderr}) + "\n")


def summarize(results: Sequence[DownloadResult]) -> None:
    success = sum(1 for res in results if res.status == "success")
    skipped = sum(1 for res in results if res.status == "skipped")
    failed = sum(1 for res in results if res.status == "failed")
    dry_run = sum(1 for res in results if res.status == "dry-run")
    logging.info("Download summary: success=%d skipped=%d failed=%d dry-run=%d", success, skipped, failed, dry_run)


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)

    entries = load_manifest(args.manifest)
    if args.sample:
        entries = entries[: args.sample]

    existing_entries = read_existing_manifest(args.output_manifest)
    if args.resume and existing_entries:
        entries = [entry for entry in entries if manifest_key(entry) not in existing_entries]
        logging.info("Resuming download; %d entries remaining", len(entries))

    results: List[DownloadResult] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        future_to_entry = {executor.submit(run_download, entry, args): entry for entry in entries}
        for future in concurrent.futures.as_completed(future_to_entry):
            try:
                result = future.result()
            except Exception as exc:  # pragma: no cover - best-effort resilience
                entry = future_to_entry[future]
                logging.exception("Download failed for %s", entry.youtube_id)
                result = DownloadResult(entry=entry, path=download_target(entry, args.download_root), status="failed", message=str(exc), duration=0.0, stderr=str(exc))
            results.append(result)

    if args.dry_run:
        logging.info("Dry run complete; no files were created.")
        return

    log_path = args.download_root / "download_log.jsonl"
    write_log(results, log_path)
    summarize(results)
    final_entries = dict(existing_entries)
    for res in results:
        if res.entry.raw_path:
            final_entries[manifest_key(res.entry)] = res.entry
    write_manifest(final_entries.values(), args.output_manifest)
    for res in results:
        if res.status == "success":
            logging.debug("Downloaded %s -> %s", res.entry.youtube_id, res.path)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning("Interrupted by user.")
        sys.exit(1)

