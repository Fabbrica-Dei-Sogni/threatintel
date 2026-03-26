#!/bin/bash

# ThreatIntel Bundle Installer
WORKING_DIR=$(pwd)
SERVICE_NAME=${1:-"threatintel-release"}
DEPLOY_USER=${2:-$(whoami)}
DEPLOY_PORT=${PORT:-"3999"}
DEPLOY_ENV=${NODE_ENV:-"production"}
DEPLOY_DESC=${DESC:-"Threat Intelligence Logger (Release Bundle)"}
TEMPLATE_FILE="threatintel.service"

# Detect version if file exists
if [ -f "VERSION" ]; then
    APP_VERSION=$(cat VERSION)
    DEPLOY_DESC="$DEPLOY_DESC v$APP_VERSION"
    echo "🏷️  Version detected: $APP_VERSION"
fi

echo "🎯 Installing ThreatIntel Bundle..."
echo "📍 Working Directory: $WORKING_DIR"
echo "📛 Service Name: $SERVICE_NAME"
echo "👤 Deploy User: $DEPLOY_USER"
echo "🌐 Port: $DEPLOY_PORT"
echo "🌍 Environment: $DEPLOY_ENV"
echo "📝 Description: $DEPLOY_DESC"

# 1. Systemd Configuration
if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    echo "------------------------------------------------------------"
    echo "⚠️  ATTENZIONE: Il servizio '$SERVICE_NAME' esiste già!"
    echo "🔄 Procedo con l'AGGIORNAMENTO dell'istanza esistente."
    echo "------------------------------------------------------------"
else
    echo "🆕 Creazione di un NUOVO servizio: $SERVICE_NAME"
fi

if [ -f "$TEMPLATE_FILE" ]; then
    echo "⚙️  Configuring systemd service..."
    # Replace placeholders with absolute path, user, etc.
    sed -e "s|{{WORKING_DIR}}|$WORKING_DIR|g" \
        -e "s|{{USER}}|$DEPLOY_USER|g" \
        -e "s|{{PORT}}|$DEPLOY_PORT|g" \
        -e "s|{{NODE_ENV}}|$DEPLOY_ENV|g" \
        -e "s|{{DESCRIPTION}}|$DEPLOY_DESC|g" \
        -e "s|{{VERSION}}|${APP_VERSION:-"unknown"}|g" \
        "$TEMPLATE_FILE" > "$SERVICE_NAME.service.final"
    
    if [ ! -s "$SERVICE_NAME.service.final" ]; then
        echo "❌ Error: Failed to generate service file (file is empty)."
        exit 1
    fi

    echo "📜 Linking service to /etc/systemd/system/$SERVICE_NAME.service..."
    FINAL_SERVICE_FILE="$WORKING_DIR/$SERVICE_NAME.service.managed"
    mv "$SERVICE_NAME.service.final" "$FINAL_SERVICE_FILE"
    
    sudo ln -sf "$FINAL_SERVICE_FILE" "/etc/systemd/system/$SERVICE_NAME.service"
    
    if [ $? -eq 0 ]; then
        echo "🔄 Reloading systemd daemon..."
        sudo systemctl daemon-reload
        
        # Verify the link is actually there
        if [ -L "/etc/systemd/system/$SERVICE_NAME.service" ]; then
            echo "✅ Service link successfully created."
        else
            echo "❌ Error: Service link missing from /etc/systemd/system/ after creation."
            exit 1
        fi
    else
        echo "❌ Error: Failed to create service link in /etc/systemd/system/."
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
