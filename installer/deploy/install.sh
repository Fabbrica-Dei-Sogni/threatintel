#!/bin/bash

# ThreatIntel - Interactive Production Installer
# Questo script viene eseguito sulla macchina di destinazione dal cliente.

WORKING_DIR=$(pwd)
SERVICE_NAME=${1:-"$(basename $(pwd))"}

# Evitiamo nomi generici se lanciato per errore da cartelle comuni o non idonee
if [ -z "$SERVICE_NAME" ] || [ "$SERVICE_NAME" = "deploy" ] || [ "$SERVICE_NAME" = "installer" ] || [ "$SERVICE_NAME" = "." ]; then
    echo "❌ Errore: Nome servizio '$SERVICE_NAME' non valido o mancante."
    echo "Specificalo esplicitamente: ./install.sh mio-servizio"
    exit 1
fi

echo "🚀 Avvio installazione per: $SERVICE_NAME"
echo "============================================================"

# 1. Wizard di Configurazione (se .env manca)
if [ ! -f "$WORKING_DIR/.env" ]; then
    if [ -f "config-wizard.sh" ]; then
        source "./config-wizard.sh"
        run_config_wizard
    else
        echo "❌ Errore: config-wizard.sh non trovato. Impossibile procedere."
        exit 1
    fi

    # Generazione .env dal template usando le variabili esportate
    if [ -f "env.template" ]; then
        echo "⚙️  Generazione file .env..."
        
        # Creiamo il file .env partendo dal template e sostituendo tutti i placeholder {{KEY}} 
        # con il valore delle variabili d'ambiente correnti
        cp "env.template" ".env"
        
        # Recupera tutte le chiavi dal manifest per fare il replacement
        # (Usiamo un approccio semplice basato su sed per ogni chiave esportata)
        for key in $(grep -oE '\{\{[A-Z0-9_]+\}\}' env.template | sed 's/{{//g' | sed 's/}}//g' | sort -u); do
            val="${!key}"
            # Escaping per sed
            escaped_val=$(echo "$val" | sed 's/[&/\]/\\&/g')
            sed -i "s|{{$key}}|$escaped_val|g" ".env"
        done
        
        # Aggiunte extra manuali (Honeypot binding)
        if [ -n "$TELNET_P" ]; then
            echo "COWRIE_TELNET_BIND=$TELNET_P:2223" >> ".env"
        fi
    fi

    # Generazione file di servizio Systemd (se il template esiste)
    if [ -f "$SERVICE_NAME.service.template" ] || [ -f "threatintel.service.template" ]; then
        TEMPLATE=$(ls *.service.template | head -n 1)
        echo "⚙️  Generazione file di servizio systemd da $TEMPLATE..."
        
        NODE_PATH=$(which node)
        NODE_BIN_DIR=$(dirname "$NODE_PATH")

        sed -e "s|{{WORKING_DIR}}|$WORKING_DIR|g" \
            -e "s|{{USER}}|$DEFAULT_USER|g" \
            -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
            -e "s|{{PORT}}|$DEPLOY_PORT|g" \
            -e "s|{{NODE_ENV}}|production|g" \
            -e "s|{{DESCRIPTION}}|$SERVICE_DESC|g" \
            -e "s|{{VERSION}}|$(cat VERSION 2>/dev/null || echo '1.0.0')|g" \
            -e "s|{{ALLOWED_ORIGINS}}|$ALLOWED_ORIGINS|g" \
            -e "s|{{APP_DOMAIN}}|$APP_DOMAIN|g" \
            -e "s|{{API_BASE_URL}}|$API_BASE_URL|g" \
            -e "s|{{APP_ID}}|$APP_ID|g" \
            -e "s|{{ALLOW_ANONYMOUS}}|true|g" \
            -e "s|{{URI_DIGITAL_AUTH}}|$URI_DIGITAL_AUTH|g" \
            -e "s|{{NODE_PATH}}|$NODE_PATH|g" \
            -e "s|{{NODE_BIN_DIR}}|$NODE_BIN_DIR|g" \
            -e "s|{{REDIS_PASSWORD}}|$REDIS_PWD|g" \
            -e "s|{{MONGO_APP_USER}}|intelagent|g" \
            -e "s|{{MONGO_APP_PWD}}|intelagent|g" \
            -e "s|{{MONGO_APP_DB}}|threatinteldb|g" \
            -e "s|{{QDRANT_URL}}|http://127.0.0.1:6333|g" \
            -e "s|{{RAG_COLLECTION_NAME}}|threat_intelligence|g" \
            -e "s|{{RAG_LOGS_COLLECTION_NAME}}|threat_logs|g" \
            -e "s|{{OLLAMA_URL}}|$OLLAMA_URL|g" \
            -e "s|{{SUMMARY_MODEL}}|$SUMMARY_MODEL|g" \
            -e "s|{{EMBEDDING_MODEL}}|$EMBEDDING_MODEL|g" \
            "$TEMPLATE" > "$SERVICE_NAME.service"
    fi

    # Generazione configurazione Nginx
    if [ -f "proxy/$SERVICE_NAME.conf.template" ] || [ -f "proxy/nginx_vhost.conf.template" ]; then
        echo "⚙️  Generazione configurazione Nginx..."
        mkdir -p proxy
        VHOST_TMP=$(ls proxy/*.conf.template 2>/dev/null | head -n 1)
        [ -z "$VHOST_TMP" ] && VHOST_TMP="proxy/nginx_vhost.conf.template"
        
        sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
            -e "s|{{PORT}}|$DEPLOY_PORT|g" \
            -e "s|{{APP_DOMAIN}}|$APP_DOMAIN|g" \
            -e "s|{{API_BASE_URL}}|$API_BASE_URL|g" \
            -e "s|{{APP_BASE_PATH}}|$CLEAN_BASE_PATH|g" \
            "$VHOST_TMP" > "proxy/$SERVICE_NAME.conf"
    fi
fi

# 2. Requisiti & Infrastruttura Docker
echo ""
read -p "❓ Vuoi avviare l'infrastruttura Docker (Mongo, Redis, Qdrant)? (y/n) [y]: " START_DOCKER
START_DOCKER=${START_DOCKER:-y}

if [[ "$START_DOCKER" =~ ^[Yy]$ ]]; then
    echo "🔍 Checking Docker infrastructure..."
    INFRA_COMPOSE="docker-compose.infra.yml"

    if [ -f "$INFRA_COMPOSE" ]; then
        # Verifica se l'infrastruttura è già attiva (Adaptive Mode)
        SHARED_INFRA_RUNNING=$(docker ps --format '{{.Names}}' | grep -E "mongodb-threatintel|redis-threatintel|qdrant-threatintel" | wc -l)
        
        if [ "$SHARED_INFRA_RUNNING" -ge 2 ]; then
            echo "ℹ️  Shared infrastructure detected and running. Skipping Docker provisioning."
        else
            echo "🚀 Starting Docker containers..."
            EXPORT_STORAGE=$(grep "STORAGE_ROOT=" .env | cut -d'=' -f2)
            export STORAGE_ROOT=${EXPORT_STORAGE:-$WORKING_DIR/storage}
            export COWRIE_TELNET_BIND=$(grep "COWRIE_TELNET_BIND=" .env | cut -d'=' -f2)
            export REDIS_PASSWORD=$(grep "REDIS_PASSWORD=" .env | cut -d'=' -f2)

            mkdir -p "$STORAGE_ROOT/mongodb" "$STORAGE_ROOT/redis" "$STORAGE_ROOT/qdrant" "$STORAGE_ROOT/cowrie/log" "$STORAGE_ROOT/cowrie/downloads"
            docker compose -f "$INFRA_COMPOSE" up -d
            if [ $? -ne 0 ]; then echo "❌ Failed to start Docker containers."; exit 1; fi
        fi
    fi
fi

# 3. Registrazione Systemd Service
echo ""
read -p "❓ Vuoi registrare il servizio systemd per $SERVICE_NAME? (y/n) [y]: " REG_SERVICE
REG_SERVICE=${REG_SERVICE:-y}

if [[ "$REG_SERVICE" =~ ^[Yy]$ ]]; then
    if [ -f "$SERVICE_NAME.service" ]; then
        echo "⚙️  Registering systemd service..."
        sudo cp "$WORKING_DIR/$SERVICE_NAME.service" /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable "$SERVICE_NAME"
        
        read -p "❓ Vuoi avviare il servizio $SERVICE_NAME ora? (y/n) [y]: " START_SERVICE
        START_SERVICE=${START_SERVICE:-y}
        if [[ "$START_SERVICE" =~ ^[Yy]$ ]]; then
            sudo systemctl restart "$SERVICE_NAME"
        fi
    fi
fi

# 4. Configurazione Nginx (se installato)
echo ""
if command -v nginx > /dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
    read -p "❓ Trovato Nginx. Vuoi installare le regole proxy per $SERVICE_NAME? (y/n) [y]: " INST_NGINX
    INST_NGINX=${INST_NGINX:-y}

    if [[ "$INST_NGINX" =~ ^[Yy]$ ]]; then
        NGINX_CONF="/etc/nginx/sites-available/$SERVICE_NAME.conf"
        NGINX_GLOB="/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf"
        
        echo "⚙️  Configuring Nginx proxy..."
        
        # 4a. Sincronizzazione Prefisso Log (Backend <-> Nginx)
        # Il backend deve sapere quale prefisso stiamo usando in Nginx
        LOG_PREFIX="nginx_threat_$SERVICE_NAME:"
        sed -i "s|^NGINX_LOG_PREFIX=.*|NGINX_LOG_PREFIX=$LOG_PREFIX|g" ".env"
        
        # 4b. Copia configurazioni
        if [ -f "proxy/$SERVICE_NAME.conf" ]; then
            sudo cp "proxy/$SERVICE_NAME.conf" "$NGINX_CONF"
            sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
        fi
        
        if [ -f "proxy/threatintel_globals_$SERVICE_NAME.conf" ]; then
            sudo cp "proxy/threatintel_globals_$SERVICE_NAME.conf" "$NGINX_GLOB"
        fi

        echo "🔍 Verifying Nginx configuration..."
        sudo nginx -t && sudo systemctl reload nginx
    fi
else
    echo "⚠️  Nginx not found, skipping proxy configuration."
fi

echo "✨ Installation complete for $SERVICE_NAME!"
# Cleanup template
rm -f "env.template" 2>/dev/null
sudo systemctl status "$SERVICE_NAME" --no-pager -l
