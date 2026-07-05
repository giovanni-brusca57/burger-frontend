#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="ghcr.io/giovanni-brusca57/burger-fe"
TAG="${1:-latest}"

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in VITE_* values."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${VITE_API_URL:?VITE_API_URL must be set in .env}"
: "${VITE_DEFAULT_REFERRAL:?VITE_DEFAULT_REFERRAL must be set in .env}"
: "${VITE_MEV_PAGE:?VITE_MEV_PAGE must be set in .env}"

GIT_SHA="$(git rev-parse --short HEAD)"

echo "Building $IMAGE_NAME:$TAG (sha-$GIT_SHA) for linux/amd64..."

docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_URL="$VITE_API_URL" \
  --build-arg VITE_DEFAULT_REFERRAL="$VITE_DEFAULT_REFERRAL" \
  --build-arg VITE_MEV_PAGE="$VITE_MEV_PAGE" \
  -t "$IMAGE_NAME:$TAG" \
  -t "$IMAGE_NAME:sha-$GIT_SHA" \
  --push \
  .

echo ""
echo "Pushed:"
echo "  $IMAGE_NAME:$TAG"
echo "  $IMAGE_NAME:sha-$GIT_SHA"
