#!/bin/bash

# Racing Game Setup Script
# This script installs the Racing Game application on your system

set -e

echo "Racing Game - Setup Script"
echo "==============================="

# Variables
INSTALL_DIR="/opt/racing-game"
SERVICE_NAME="racing-game.service"
SERVICE_USER="racing-game"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] This script must be run as root"
  exit 1
fi

echo "Installing Docker dependencies..."
apt-get update
apt-get install -y docker.io docker-compose git curl

# Create user
echo "Creating service user..."
if ! id -u "$SERVICE_USER" > /dev/null 2>&1; then
  useradd -r -s /bin/bash -d "$INSTALL_DIR" "$SERVICE_USER"
  echo "[OK] Created user $SERVICE_USER"
else
  echo "[OK] User $SERVICE_USER already exists"
fi

# Create installation directory
echo "Setting up installation directory..."
mkdir -p "$INSTALL_DIR"

# Clone or copy repository
if [ -d ".git" ]; then
  echo "Copying repository to $INSTALL_DIR..."
  cp -r . "$INSTALL_DIR"
else
  echo "[ERROR] Not in a git repository. Please run this script from the project root."
  exit 1
fi

# Set permissions
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR"

# Create environment file
echo "Creating environment file..."
if [ ! -f "$INSTALL_DIR/.env" ]; then
  cat > "$INSTALL_DIR/.env" << 'EOF'
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=change_this_password_in_production
DB_NAME=racing_game

# Backend
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-in-production
PORT=3001
HOST=0.0.0.0

# Frontend
FRONTEND_PORT=3000

# Docker ports
BACKEND_PORT=3001

# CORS
CORS_ORIGIN=*

# API URL for frontend
API_URL=http://localhost:3001/api
EOF
  echo "[OK] Created .env file - PLEASE EDIT WITH YOUR SETTINGS!"
else
  echo "[OK] .env file already exists"
fi

# Install systemd service
echo "Installing systemd service..."
cp "$INSTALL_DIR/racing-game.service" "/etc/systemd/system/$SERVICE_NAME"
chmod 644 "/etc/systemd/system/$SERVICE_NAME"
systemctl daemon-reload
echo "[OK] Service installed"

# Enable and start service
echo "Starting service..."
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

# Show status
echo ""
echo "[OK] Installation complete!"
echo ""
echo "Service Status:"
systemctl status "$SERVICE_NAME" --no-pager —lines=3
echo ""
echo "Next steps:"
echo "1. Edit /opt/racing-game/.env with your configuration"
echo "2. Run: systemctl restart racing-game.service"
echo "3. Check logs: journalctl -u racing-game.service -f"
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:3001/api"

# Docker compose setup for local development

docker-compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
sleep 5

# Create database and run migrations
PGPASSWORD=password psql -h localhost -U postgres -c "CREATE DATABASE racing_game;" 2>/dev/null || true

echo "[OK] Database setup complete"
