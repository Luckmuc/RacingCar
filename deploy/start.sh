#!/bin/bash

# Racing Game - Quick Start
# Usage: ./deploy/start.sh

set -e

INSTALL_DIR="/opt/racing-game"

echo "Racing Game - Starting"

if [ ! -d "$INSTALL_DIR" ]; then
  echo "[ERROR] Application not installed. Run: sudo ./deploy/setup-docker.sh"
  exit 1
fi

cd "$INSTALL_DIR"

echo "Checking environment..."
if [ ! -f ".env" ]; then
  echo "[ERROR] .env file not found"
  exit 1
fi

echo "Starting Docker containers..."
docker compose up -d

echo "Waiting for services to be ready..."
sleep 10

echo "Service status:"
docker compose ps

echo ""
echo "[OK] Services started successfully!"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo ""
echo "View logs: docker compose logs -f"
