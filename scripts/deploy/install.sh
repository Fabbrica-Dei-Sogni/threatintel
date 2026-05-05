#!/bin/bash

# ThreatIntel Bundle Installer (Simplified v2)
# Questo script si occupa solo della registrazione a livello OS.
# Il file di servizio deve essere già stato parametrizzato dal deployer.

WORKING_DIR=$(pwd)
SERVICE_NAME=${1:-"threatintel-release"}

echo "🎯 Installing ThreatIntel Service: $SERVICE_NAME"
echo "📍 Source Path: $WORKING_DIR/$SERVICE_NAME.service"

if [ ! -f "$WORKING_DIR/$SERVICE_NAME.service" ]; then
    echo "❌ Errore: File di servizio '$SERVICE_NAME.service' non trovato in $WORKING_DIR"
    exit 1
fi

# 1. Systemd Registration
echo "📜 Linking service to /etc/systemd/system/$SERVICE_NAME.service..."
sudo ln -sf "$WORKING_DIR/$SERVICE_NAME.service" "/etc/systemd/system/$SERVICE_NAME.service"

if [ $? -eq 0 ]; then
    echo "🔄 Reloading systemd daemon..."
    sudo systemctl daemon-reload
    
    # Abilitazione automatica
    sudo systemctl enable "$SERVICE_NAME"
    
    echo "✅ Servizio $SERVICE_NAME registrato e abilitato."
    
    read -p "▶️  Vuoi avviare il servizio ora? [Y/n]: " START_NOW
    if [[ ! "$START_NOW" =~ ^([nN][oO]|[nN])$ ]]; then
        sudo systemctl start "$SERVICE_NAME"
        echo "🚀 Servizio avviato."
    fi
else
    echo "❌ Errore durante la creazione del link simbolico."
    exit 1
fi

# 2. Nginx Configuration (Optional)
echo "------------------------------------------------------------"
read -p "🌐 Vuoi configurare anche Nginx (Proxy & Traps) ora? [y/N]: " DO_NGINX
if [[ "$DO_NGINX" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "⚙️  Configurazione Nginx in corso..."
    PROXY_DIR="$WORKING_DIR/proxy"
    if [ -d "$PROXY_DIR" ]; then
        echo "🔗 Linking globals..."
        sudo ln -sf "$PROXY_DIR/threatintel_globals_$SERVICE_NAME.conf" /etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf
        echo "🔗 Linking vhost..."
        sudo ln -sf "$PROXY_DIR/$SERVICE_NAME.conf" "/etc/nginx/sites-available/$SERVICE_NAME.conf"
        sudo ln -sf "/etc/nginx/sites-available/$SERVICE_NAME.conf" "/etc/nginx/sites-enabled/$SERVICE_NAME.conf"
        if sudo nginx -t; then
            sudo systemctl reload nginx
            echo "✅ Nginx ricaricato con successo."
        else
            echo "❌ Errore Nginx. Controlla manualmente."
        fi
    else
        echo "⚠️  Cartella proxy non trovata nel bundle."
    fi
fi

# 3. Environment check (per sicurezza)
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from template (please edit it!)"
        cp .env.example .env
    fi
fi

echo "✨ Done."
