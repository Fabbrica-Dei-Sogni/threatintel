#!/bin/bash

# Managed-By: threatintel-release-workflow

# Questo script disinstalla l'istanza specifica di ThreatIntel.
# Può essere chiamato direttamente o tramite l'orchestratore globale.

SERVICE_NAME=${1:-"$(basename $(pwd))"}

echo "🗑️  ThreatIntel Atomic Uninstaller: $SERVICE_NAME"
echo "------------------------------------------------"

# 1. Systemd Cleanup
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME.service"

if [ -L "$SERVICE_PATH" ] || [ -f "$SERVICE_PATH" ]; then
    echo "🛑 Fermando il servizio $SERVICE_NAME..."
    sudo systemctl stop "$SERVICE_NAME" 2>/dev/null
    sudo systemctl disable "$SERVICE_NAME" 2>/dev/null
    
    echo "🗑️  Rimuovendo file di servizio..."
    sudo rm -f "$SERVICE_PATH"
    sudo systemctl daemon-reload
    echo "✅ Servizio systemd rimosso."
else
    echo "ℹ️  Servizio systemd non trovato o già rimosso."
fi

# 2. Nginx Cleanup
echo "🧹 Verifico configurazioni Nginx per $SERVICE_NAME..."

NGINX_VHOST_ENABLED="/etc/nginx/sites-enabled/$SERVICE_NAME.conf"
NGINX_VHOST_AVAILABLE="/etc/nginx/sites-available/$SERVICE_NAME.conf"
NGINX_GLOBALS="/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf"

RELOAD_NGINX=false

# Funzione per rimuovere link o file Nginx in modo sicuro
safe_remove_nginx() {
    if [ -L "$1" ] || [ -f "$1" ]; then
        sudo rm -f "$1"
        echo "🗑️  Rimosso: $1"
        RELOAD_NGINX=true
    fi
}

safe_remove_nginx "$NGINX_VHOST_ENABLED"
safe_remove_nginx "$NGINX_VHOST_AVAILABLE"
safe_remove_nginx "$NGINX_GLOBALS"

if [ "$RELOAD_NGINX" = true ]; then
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo "✅ Nginx ricaricato correttamente."
    else
        echo "⚠️  Nginx ha errori di configurazione. Controlla manualmente con 'sudo nginx -t'."
    fi
else
    echo "ℹ️  Nessuna configurazione Nginx trovata da rimuovere."
fi

echo "✨ Disinstallazione di $SERVICE_NAME completata."
