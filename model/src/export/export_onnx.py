"""
Converts a PyTorch checkpoint into an ONNX classification model.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.train.utils import build_model


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export a checkpoint to ONNX.")
    parser.add_argument("--checkpoint", type=Path, required=True, help="Path to the PyTorch checkpoint.")
    parser.add_argument("--output", type=Path, default=Path("backend/models/exported/classifier.onnx"), help="Output ONNX path.")
    parser.add_argument("--architecture", choices=("mlp", "lstm", "tcn"), default="tcn", help="Architecture to instantiate.")
    parser.add_argument("--sequence-length", type=int, default=64, help="Sequence length.")
    parser.add_argument("--feature-dim", type=int, default=63, help="Feature dimension (21 landmarks x 3).")
    parser.add_argument("--hidden-dim", type=int, default=256, help="Hidden dimension.")
    parser.add_argument("--dropout", type=float, default=0.2, help="Dropout.")
    parser.add_argument("--device", default="cpu", help="Device for tracing.")
    parser.add_argument("--opset", type=int, default=13, help="ONNX opset version.")
    parser.add_argument("--input-name", default="input", help="ONNX input tensor name.")
    parser.add_argument("--output-name", default="logits", help="ONNX output tensor name.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    configure_logging(args.verbose)
    device = torch.device(args.device)
    checkpoint = torch.load(args.checkpoint, map_location=device)
    sequence_length = checkpoint.get("sequence_length", args.sequence_length)
    feature_dim = checkpoint.get("feature_dim", args.feature_dim)
    num_classes = checkpoint.get("num_classes", 100)
    model = build_model(
        args.architecture,
        sequence_length,
        feature_dim,
        num_classes,
        args.hidden_dim,
        args.dropout,
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()

    dummy = torch.rand(1, args.sequence_length, args.feature_dim, device=device)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy,
        str(args.output),
        opset_version=args.opset,
        input_names=[args.input_name],
        output_names=[args.output_name],
        dynamic_axes={args.input_name: {0: "batch"}, args.output_name: {0: "batch"}},
    )
    logging.info("Exported ONNX model to %s", args.output)


if __name__ == "__main__":
    main()

