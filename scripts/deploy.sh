#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="ghcr.io/giovanni-brusca57/burger-fe"
TAG="${1:-latest}"
APP_NAME="burger-fe"
PORT="8080"

echo "Pulling $IMAGE_NAME:$TAG..."
docker pull "$IMAGE_NAME:$TAG"

echo "Stopping existing container (if any)..."
docker stop "$APP_NAME" 2>/dev/null || true
docker rm "$APP_NAME" 2>/dev/null || true

echo "Starting $APP_NAME on port $PORT..."
docker run -d \
  --restart unless-stopped \
  --name "$APP_NAME" \
  -p "$PORT:80" \
  "$IMAGE_NAME:$TAG"

echo "Cleaning up unused images..."
docker container prune -f
docker image prune -a -f

echo ""
echo "Deployed $IMAGE_NAME:$TAG -> http://localhost:$PORT"
