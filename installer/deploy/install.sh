#!/bin/bash

# ThreatIntel Bundle Installer (Atomic & Idempotent)
# Questo script si occupa della registrazione a livello OS (systemd + nginx).

WORKING_DIR=$(pwd)
SERVICE_NAME=${1:-"$(basename $WORKING_DIR)"}
PORT=${2:-"3999"} # Fallback se non passata, ma solitamente gestita dal deployer

echo "🎯 Installing ThreatIntel Service: $SERVICE_NAME"
echo "📍 Source Path: $WORKING_DIR"

# 1. Idempotency Check: Se esiste già, lo fermiamo
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "🔄 Il servizio $SERVICE_NAME è già attivo. Lo fermo per l'aggiornamento..."
    sudo systemctl stop "$SERVICE_NAME"
fi

# 2. Systemd Registration
SERVICE_TEMPLATE="$WORKING_DIR/$SERVICE_NAME.service"
# Se il template specifico non esiste (magari è la prima installazione), cerchiamo quello generico
if [ ! -f "$SERVICE_TEMPLATE" ]; then
    SERVICE_TEMPLATE="$WORKING_DIR/threatintel.service.template"
fi

if [ -f "$SERVICE_TEMPLATE" ]; then
    echo "📜 Linking service to /etc/systemd/system/$SERVICE_NAME.service..."
    sudo ln -sf "$SERVICE_TEMPLATE" "/etc/systemd/system/$SERVICE_NAME.service"
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    echo "✅ Servizio systemd registrato."
else
    echo "⚠️  Attenzione: File di servizio non trovato. Salto la parte systemd."
fi

# 3. Nginx Configuration
echo "------------------------------------------------------------"
read -p "🌐 Vuoi configurare/aggiornare Nginx (Proxy & Traps)? [y/N]: " DO_NGINX
if [[ "$DO_NGINX" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "⚙️  Configurazione Nginx in corso..."
    PROXY_DIR="$WORKING_DIR/proxy"
    
    # Verifica che i file esistano prima di linkare (evita link rotti che rompono nginx -t)
    GLOBAL_CONF="$PROXY_DIR/threatintel_globals_$SERVICE_NAME.conf"
    VHOST_CONF="$PROXY_DIR/$SERVICE_NAME.conf"

    # Se non esistono i file già pronti, proviamo a vedere se ci sono i template nel bundle
    if [ ! -f "$GLOBAL_CONF" ] && [ -f "$PROXY_DIR/nginx_globals.template" ]; then
         echo "📝 Nota: Usare i template per generare le conf prima di installare (il deployer dovrebbe averlo fatto)."
    fi

    RELOAD_REQUIRED=false

    if [ -f "$GLOBAL_CONF" ]; then
        sudo ln -sf "$GLOBAL_CONF" "/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf"
        echo "🔗 Linkato Globals."
        RELOAD_REQUIRED=true
    fi

    if [ -f "$VHOST_CONF" ]; then
        sudo ln -sf "$VHOST_CONF" "/etc/nginx/sites-available/$SERVICE_NAME.conf"
        sudo ln -sf "/etc/nginx/sites-available/$SERVICE_NAME.conf" "/etc/nginx/sites-enabled/$SERVICE_NAME.conf"
        echo "🔗 Linkato VHost."
        RELOAD_REQUIRED=true
    fi

    if [ "$RELOAD_REQUIRED" = true ]; then
        if sudo nginx -t; then
            sudo systemctl reload nginx
            echo "✅ Nginx configurato e ricaricato."
        else
            echo "❌ Errore critico nella configurazione Nginx. Operazione annullata."
            echo "🧹 Rimuovo i link configurati per evitare stati corrotti..."
            sudo rm -f "/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf" 2>/dev/null
            sudo rm -f "/etc/nginx/sites-enabled/$SERVICE_NAME.conf" 2>/dev/null
            sudo rm -f "/etc/nginx/sites-available/$SERVICE_NAME.conf" 2>/dev/null
            exit 1
        fi
    fi
fi

# 4. Environment Check
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from template..."
        cp .env.example .env
    fi
fi

echo "🚀 Avvio il servizio..."
sudo systemctl start "$SERVICE_NAME"

echo "✨ Done. Status:"
sudo systemctl status "$SERVICE_NAME" --no-pager -l
