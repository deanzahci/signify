#!/bin/bash
set -e

cd "$(dirname "$0")"

IMAGE_NAME="signify-backend"
CONTAINER_NAME="signify-backend-instance"
PORT=8765

echo "Build Docker image..."
docker build -t $IMAGE_NAME .

echo "Stopping existing container if running..."
docker rm -f $CONTAINER_NAME 2>/dev/null || true

echo "Running container..."
echo "Listening on ws://localhost:$PORT"
docker run --name $CONTAINER_NAME \
  -p $PORT:$PORT \
  -e WEBSOCKET_HOST="0.0.0.0" \
  -e WEBSOCKET_PORT=$PORT \
  $IMAGE_NAME
