#!/bin/bash

# ThreatIntel Bundle Installer
WORKING_DIR=$(pwd)
SERVICE_NAME=${1:-"threatintel-release"}
DEPLOY_USER=${2:-$(whoami)}
DEPLOY_PORT=${PORT:-"3999"}
DEPLOY_ENV=${NODE_ENV:-"production"}
DEPLOY_DESC=${DESC:-"Threat Intelligence Logger (Release Bundle)"}
TEMPLATE_FILE="threatintel.service"

echo "🎯 Installing ThreatIntel Bundle..."
echo "📍 Working Directory: $WORKING_DIR"
echo "📛 Service Name: $SERVICE_NAME"
echo "👤 Deploy User: $DEPLOY_USER"
echo "🌐 Port: $DEPLOY_PORT"
echo "🌍 Environment: $DEPLOY_ENV"
echo "📝 Description: $DEPLOY_DESC"

# 1. Systemd Configuration
if [ -f "$TEMPLATE_FILE" ]; then
    echo "⚙️  Configuring systemd service..."
    # Replace placeholders with absolute path, user, etc.
    sed -e "s|{{WORKING_DIR}}|$WORKING_DIR|g" \
        -e "s|{{USER}}|$DEPLOY_USER|g" \
        -e "s|{{PORT}}|$DEPLOY_PORT|g" \
        -e "s|{{NODE_ENV}}|$DEPLOY_ENV|g" \
        -e "s|{{DESCRIPTION}}|$DEPLOY_DESC|g" \
        "$TEMPLATE_FILE" > "$SERVICE_NAME.service.final"
    
    if [ ! -s "$SERVICE_NAME.service.final" ]; then
        echo "❌ Error: Failed to generate service file (file is empty)."
        exit 1
    fi

    echo "📜 Deploying service to /etc/systemd/system/$SERVICE_NAME.service..."
    sudo cp "$SERVICE_NAME.service.final" "/etc/systemd/system/$SERVICE_NAME.service"
    
    if [ $? -eq 0 ]; then
        echo "🔄 Reloading systemd daemon..."
        sudo systemctl daemon-reload
        
        # Verify the file is actually there and readable by systemd
        if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
            echo "✅ Service file successfully deployed and recognized."
        else
            echo "❌ Error: Service file missing from /etc/systemd/system/ after copy."
            exit 1
        fi
    else
        echo "❌ Error: Failed to copy service file to /etc/systemd/system/."
        exit 1
    fi
    
    echo "✅ Service configured!"
    echo "🚀 To start: sudo systemctl start $SERVICE_NAME"
    echo "📊 To check status: sudo systemctl status $SERVICE_NAME"
else
    echo "❌ Error: Template $TEMPLATE_FILE not found in current directory."
    exit 1
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
