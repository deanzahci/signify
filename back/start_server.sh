#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Starting Signify WebSocket Server..."
echo "Host: ${WEBSOCKET_HOST:-0.0.0.0}"
echo "Port: ${WEBSOCKET_PORT:-8765}"
echo ""

uv run python main.py
