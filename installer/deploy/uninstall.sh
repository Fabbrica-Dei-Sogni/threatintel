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

# 3. Docker Infrastructure Cleanup
# L'installer salva il file come docker-compose.yml, non docker-compose.infra.yml
COMPOSE_FILE="docker-compose.yml"
if [ -f "$COMPOSE_FILE" ]; then
    echo "🐳 Verifico infrastruttura Docker ($COMPOSE_FILE)..."
    echo "🛑 Fermando e rimuovendo container e volumi Docker..."
    docker compose -f "$COMPOSE_FILE" down -v
    echo "✅ Infrastruttura Docker rimossa (volumi inclusi)."
else
    # Fallback per vecchie versioni
    if [ -f "docker-compose.infra.yml" ]; then
        docker compose -f docker-compose.infra.yml down -v
    fi
fi

# 4. Storage Cleanup (Opzionale)
if [ -f ".env" ]; then
    STORAGE_PATH=$(grep "^STORAGE_ROOT=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')
    if [ -d "$STORAGE_PATH" ]; then
        echo -e "\n⚠️  Rilevata cartella storage: $STORAGE_PATH"
        read -p "❓ Vuoi eliminare DEFINITIVAMENTE tutti i dati (Database e Log)? (y/N): " DELETE_STORAGE
        if [[ "$DELETE_STORAGE" =~ ^[Yy]$ ]]; then
            echo "🗑️  Eliminazione dati in corso..."
            sudo rm -rf "$STORAGE_PATH"
            echo "✅ Dati eliminati."
        else
            echo "📁 Dati conservati in: $STORAGE_PATH"
        fi
    fi
fi

echo "✨ Disinstallazione di $SERVICE_NAME completata."
