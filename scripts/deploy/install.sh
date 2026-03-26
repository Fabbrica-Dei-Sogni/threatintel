#!/bin/bash

# ThreatIntel Bundle Installer
WORKING_DIR=$(pwd)
SERVICE_NAME="threatintel"

echo "🎯 Installing ThreatIntel Bundle..."
echo "📍 Working Directory: $WORKING_DIR"

# 1. Systemd Configuration
if [ -f "threatintel.service" ]; then
    echo "⚙️  Configuring systemd service..."
    # Replace placeholder with absolute path
    sed "s|{{WORKING_DIR}}|$WORKING_DIR|g" threatintel.service > "$SERVICE_NAME.service.final"
    
    echo "📜 Deploying service to /etc/systemd/system/..."
    sudo cp "$SERVICE_NAME.service.final" "/etc/systemd/system/$SERVICE_NAME.service"
    sudo systemctl daemon-reload
    
    echo "✅ Service configured!"
    echo "🚀 To start: sudo systemctl start $SERVICE_NAME"
    echo "📊 To check status: sudo systemctl status $SERVICE_NAME"
else
    echo "⚠️  Warning: threatintel.service not found."
fi

# 2. Environment check
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from template (please edit it!)"
        cp .env.example .env
    else
        echo "⚠️  Warning: No .env or .env.example found."
    fi
fi

echo "✨ Installation complete! (No npm install required for bundled artifact)"
