#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path


def run_test(test_file):
    print(f"\n{'=' * 60}")
    print(f"Running: {test_file.name}")
    print("=" * 60)
    result = subprocess.run([sys.executable, str(test_file)], cwd=test_file.parent)
    return result.returncode == 0


def main():
    test_dir = Path(__file__).parent / "test"
    test_files = sorted(test_dir.glob("test_*.py"))

    if not test_files:
        print("No test files found!")
        return 1

    print(f"Found {len(test_files)} test files")

    results = {}
    for test_file in test_files:
        results[test_file.name] = run_test(test_file)

    print(f"\n{'=' * 60}")
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, success in results.items():
        status = "PASSED" if success else "FAILED"
        symbol = "✓" if success else "✗"
        print(f"{symbol} {test_name}: {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
