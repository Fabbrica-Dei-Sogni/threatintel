#!/bin/bash

# Managed-By: threatintel-release-workflow

echo "🗑️  ThreatIntel Release Uninstaller"
echo "----------------------------------"

# 1. Scoperta dei servizi gestiti
MANAGED_SERVICES=$(grep -l "Managed-By: threatintel-release-workflow" /etc/systemd/system/*.service 2>/dev/null | xargs -r -n1 basename | sort -u)

if [ -z "$MANAGED_SERVICES" ]; then
    echo "ℹ️  Nessun servizio gestito trovato nel sistema."
    exit 0
fi

if [ -n "$1" ]; then
    # Se passato come argomento, usalo direttamente
    SERVICE_TO_REMOVE="$1"
    # Verifica che sia effettivamente gestito da noi
    if ! echo "$MANAGED_SERVICES" | grep -q "^$SERVICE_TO_REMOVE$"; then
        echo "⚠️  Attenzione: Il servizio '$SERVICE_TO_REMOVE' non sembra essere gestito da questo workflow."
        read -p "Vuoi procedere comunque? [y/N]: " PROCEED
        if [[ ! "$PROCEED" =~ ^([yY][eE][sS]|[yY])$ ]]; then exit 1; fi
    fi
else
    # Altrimenti mostra lista interattiva
    echo "Servizi trovati:"
    select SERVICE in $MANAGED_SERVICES; do
        if [ -n "$SERVICE" ]; then
            SERVICE_TO_REMOVE="$SERVICE"
            break
        fi
    done
fi

if [ -z "$SERVICE_TO_REMOVE" ]; then exit 0; fi

# 2. Rimozione
echo "🧹 Rimuovendo $SERVICE_TO_REMOVE..."

SERVICE_PATH="/etc/systemd/system/$SERVICE_TO_REMOVE"

if [ -L "$SERVICE_PATH" ] || [ -f "$SERVICE_PATH" ]; then
    sudo systemctl stop "$SERVICE_TO_REMOVE" 2>/dev/null
    sudo systemctl disable "$SERVICE_TO_REMOVE" 2>/dev/null
    
    # Check again because systemctl disable might have already removed the symlink
    if [ -L "$SERVICE_PATH" ] || [ -f "$SERVICE_PATH" ]; then
        sudo rm "$SERVICE_PATH"
    fi
    
    sudo systemctl daemon-reload
    echo "✅ Servizio $SERVICE_NAME rimosso correttamente da systemd."

    # 3. Rimozione Nginx (Se presente)
    echo "🧹 Verifico configurazioni Nginx..."
    NGINX_VHOST_ENABLED="/etc/nginx/sites-enabled/$SERVICE_NAME.conf"
    NGINX_VHOST_AVAILABLE="/etc/nginx/sites-available/$SERVICE_NAME.conf"
    NGINX_GLOBALS="/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf"

    RELOAD_NGINX=false

    if [ -L "$NGINX_VHOST_ENABLED" ] || [ -f "$NGINX_VHOST_ENABLED" ]; then
        sudo rm "$NGINX_VHOST_ENABLED"
        echo "🗑️  Rimosso vhost-enabled Nginx."
        RELOAD_NGINX=true
    fi

    if [ -L "$NGINX_VHOST_AVAILABLE" ] || [ -f "$NGINX_VHOST_AVAILABLE" ]; then
        sudo rm "$NGINX_VHOST_AVAILABLE"
        echo "🗑️  Rimosso vhost-available Nginx."
        RELOAD_NGINX=true
    fi

    if [ -L "$NGINX_GLOBALS" ] || [ -f "$NGINX_GLOBALS" ]; then
        sudo rm "$NGINX_GLOBALS"
        echo "🗑️  Rimosse configurazioni globali Nginx."
        RELOAD_NGINX=true
    fi

    if [ "$RELOAD_NGINX" = true ]; then
        if sudo nginx -t 2>/dev/null; then
            sudo systemctl reload nginx
            echo "✅ Nginx ricaricato correttamente."
        else
            echo "⚠️  Nginx ha errori di configurazione. Controlla manualmente."
        fi
    fi
    else
    echo "⚠️  Il file $SERVICE_PATH non esiste più o è già stato rimosso."
    fi
