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
    CONFIRMED=false
    
    while [ "$CONFIRMED" = false ]; do
        echo "📝 Configurazione iniziale rilevata. Rispondi alle seguenti domande:"
        echo "------------------------------------------------------------"
        
        # Defaults (vengono resettati se l'utente sceglie di rifare il wizard)
        DEFAULT_DOMAIN="localhost"
        DEFAULT_PORT="3999"
        DEFAULT_USER=$(whoami)
        DEFAULT_AUTH_URI="https://alessandromodica.com:3443/auth/api/v1"
        DEFAULT_DESC="Threat Intelligence Logger - $SERVICE_NAME"
        DEFAULT_OLLAMA_URL="http://82.112.255.186:11434"
        DEFAULT_SUMMARY_MODEL="gemma3:1b"
        DEFAULT_EMBEDDING_MODEL="nomic-embed-text"
        DEFAULT_STORAGE="$WORKING_DIR/storage"
        DEFAULT_ALLOWED_ORIGINS="*"
        DEFAULT_TELNET_P="23"
        
        echo "📦 INFORMAZIONI GENERALI"
        read -p "📛 Nome del Servizio [$SERVICE_NAME]: " NEW_SERVICE_NAME
        SERVICE_NAME=${NEW_SERVICE_NAME:-$SERVICE_NAME}

        read -p "📝 Descrizione del Servizio [$DEFAULT_DESC]: " SERVICE_DESC
        SERVICE_DESC=${SERVICE_DESC:-$DEFAULT_DESC}
        echo ""

        echo "🌐 RETE E ACCESSO"
        read -p "🌐 Dominio Applicazione [$DEFAULT_DOMAIN]: " APP_DOMAIN
        APP_DOMAIN=${APP_DOMAIN:-$DEFAULT_DOMAIN}

        read -p "🛡️  Allowed Origins [$DEFAULT_ALLOWED_ORIGINS]: " ALLOWED_ORIGINS
        ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-$DEFAULT_ALLOWED_ORIGINS}

        read -p "🌐 Porta locale del servizio [$DEFAULT_PORT]: " DEPLOY_PORT
        DEPLOY_PORT=${DEPLOY_PORT:-$DEFAULT_PORT}

        read -p "📂 Base Path (es. /honeypot) [INVIO per root /]: " APP_BASE_PATH
        APP_BASE_PATH=${APP_BASE_PATH:-""}

        # Normalizzazione Base Path
        CLEAN_BASE_PATH=$APP_BASE_PATH
        if [[ -n "$CLEAN_BASE_PATH" && "$CLEAN_BASE_PATH" != /* ]]; then CLEAN_BASE_PATH="/$CLEAN_BASE_PATH"; fi
        CLEAN_BASE_PATH=${CLEAN_BASE_PATH%/}

        DYNAMIC_API_BASE="https://$APP_DOMAIN$CLEAN_BASE_PATH/api"
        read -p "🔗 API Base URL ($DYNAMIC_API_BASE): " API_BASE_URL
        API_BASE_URL=${API_BASE_URL:-$DYNAMIC_API_BASE}
        echo ""

        echo "📂 INFRASTRUTTURA"
        read -p "📂 Percorso Storage Locale [$DEFAULT_STORAGE]: " APP_STORAGE
        APP_STORAGE=${APP_STORAGE:-$DEFAULT_STORAGE}
        echo ""

        echo "🔐 SICUREZZA"
        read -p "🔐 Digital Auth IdP URI [$DEFAULT_AUTH_URI]: " URI_DIGITAL_AUTH
        URI_DIGITAL_AUTH=${URI_DIGITAL_AUTH:-$DEFAULT_AUTH_URI}

        read -sp "🔑 Password per Redis (INVIO per default): " REDIS_PWD
        echo ""
        REDIS_PWD=${REDIS_PWD:-"!!!HoneyPotRedis!!!"}

        # Calcolo APP_ID dinamico per l'installer
        CLEAN_DOMAIN=$(echo "$APP_DOMAIN" | sed -e 's|https://||g' -e 's|http://||g' -e 's|/.*||g')
        [ -z "$CLEAN_DOMAIN" ] && CLEAN_DOMAIN="localhost"
        DEFAULT_APP_ID="com.$CLEAN_DOMAIN.$SERVICE_NAME"
        
        read -p "🆔 Application ID [$DEFAULT_APP_ID]: " APP_ID
        APP_ID=${APP_ID:-$DEFAULT_APP_ID}
        echo ""

        echo "🕸️  HONEYPOTS & TRAPS"
        read -p "📡 Porta Honeypot TELNET [$DEFAULT_TELNET_P]: " TELNET_P
        TELNET_P=${TELNET_P:-$DEFAULT_TELNET_P}
        echo ""

        echo "🤖 INTELLIGENZA ARTIFICIALE (Ollama)"
        # Suggerimento dinamico per Ollama: se localhost usa l'IP specifico, altrimenti segue il dominio app
        if [ "$APP_DOMAIN" = "localhost" ]; then
            SUGGESTED_OLLAMA="http://82.112.255.186:11434"
        else
            SUGGESTED_OLLAMA="http://$APP_DOMAIN:11434"
        fi

        read -p "🔗 Ollama URI [$SUGGESTED_OLLAMA]: " OLLAMA_URL
        OLLAMA_URL=${OLLAMA_URL:-$SUGGESTED_OLLAMA}

        read -p "🧠 Summary Model [$DEFAULT_SUMMARY_MODEL]: " SUMMARY_MODEL
        SUMMARY_MODEL=${SUMMARY_MODEL:-$DEFAULT_SUMMARY_MODEL}

        read -p "🔡 Embedding Model [$DEFAULT_EMBEDDING_MODEL]: " EMBEDDING_MODEL
        EMBEDDING_MODEL=${EMBEDDING_MODEL:-$DEFAULT_EMBEDDING_MODEL}

        echo ""
        echo "🧐 RIEPILOGO CONFIGURAZIONE:"
        echo "------------------------------------------------------------"
        echo "  Servizio:      $SERVICE_NAME ($SERVICE_DESC)"
        echo "  Dominio/Porta: $APP_DOMAIN ($DEPLOY_PORT)"
        echo "  Base Path:     ${CLEAN_BASE_PATH:-/}"
        echo "  API URL:       $API_BASE_URL"
        echo "  Allowed Org:   $ALLOWED_ORIGINS"
        echo "  Storage Path:  $APP_STORAGE"
        echo "  Honeypot Port: $TELNET_P"
        echo "  AI URL:        $OLLAMA_URL"
        echo "  AI Models:     $SUMMARY_MODEL / $EMBEDDING_MODEL"
        echo "------------------------------------------------------------"
        
        read -p "✅ Le impostazioni sono corrette? (y/n): " CONFIRM_CHOICE
        if [[ "$CONFIRM_CHOICE" =~ ^[Yy]$ ]]; then
            CONFIRMED=true
        else
            read -p "Rifare da zero (r) o Uscire (q)? [r]: " FAIL_CHOICE
            if [ "$FAIL_CHOICE" = "q" ]; then
                echo "❌ Installazione annullata."
                exit 0
            fi
            echo "🔄 Riavvio wizard (i valori sono stati resettati ai default)..."
            echo ""
        fi
    done

    # Generazione .env dal template
    if [ -f "env.template" ]; then
        echo "⚙️  Generazione file .env..."
        sed -e "s|{{STORAGE_ROOT}}|$APP_STORAGE|g" \
            -e "s|{{PORT}}|$DEPLOY_PORT|g" \
            -e "s|{{APP_DOMAIN}}|$APP_DOMAIN|g" \
            -e "s|{{ALLOWED_ORIGINS}}|$ALLOWED_ORIGINS|g" \
            -e "s|{{VERSION}}|$(cat VERSION 2>/dev/null || echo '1.0.0')|g" \
            -e "s|{{APP_ID}}|$APP_ID|g" \
            -e "s|{{MONGO_ROOT_USER}}|admin|g" \
            -e "s|{{MONGO_ROOT_PWD}}|!!!AdminMongo!!!|g" \
            -e "s|{{MONGO_APP_USER}}|intelagent|g" \
            -e "s|{{MONGO_APP_PWD}}|intelagent|g" \
            -e "s|{{MONGO_APP_DB}}|threatinteldb|g" \
            -e "s|{{REDIS_PASSWORD}}|$REDIS_PWD|g" \
            -e "s|{{RAG_COLLECTION_NAME}}|threat_intelligence|g" \
            -e "s|{{RAG_LOGS_COLLECTION_NAME}}|threat_logs|g" \
            -e "s|{{RAG_ENABLED}}|true|g" \
            -e "s|{{OLLAMA_URL}}|$OLLAMA_URL|g" \
            -e "s|{{SUMMARY_MODEL}}|$SUMMARY_MODEL|g" \
            -e "s|{{EMBEDDING_MODEL}}|$EMBEDDING_MODEL|g" \
            -e "s|{{URI_DIGITAL_AUTH}}|$URI_DIGITAL_AUTH|g" \
            -e "s|{{ALLOW_ANONYMOUS}}|true|g" \
            "env.template" > ".env"
        
        echo "COWRIE_TELNET_BIND=$TELNET_P:2223" >> ".env"
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
echo "🔍 Checking Docker infrastructure..."
INFRA_COMPOSE="docker-compose.infra.yml"

if [ -f "$INFRA_COMPOSE" ]; then
    # Verifica se l'infrastruttura è già attiva (Adaptive Mode)
    SHARED_INFRA_RUNNING=$(docker ps --format '{{.Names}}' | grep -E "mongodb-threatintel|redis-threatintel|qdrant-threatintel" | wc -l)
    
    if [ "$SHARED_INFRA_RUNNING" -ge 2 ]; then
        echo "ℹ️  Shared infrastructure detected and running. Skipping Docker provisioning."
    else
        echo "🚀 Starting Docker containers..."
        # Carichiamo STORAGE_ROOT dal .env
        EXPORT_STORAGE=$(grep "STORAGE_ROOT=" .env | cut -d'=' -f2)
        export STORAGE_ROOT=${EXPORT_STORAGE:-$WORKING_DIR/storage}
        
        # Iniezione porte Cowrie per docker-compose (da .env)
        export COWRIE_TELNET_BIND=$(grep "COWRIE_TELNET_BIND=" .env | cut -d'=' -f2)
        export REDIS_PASSWORD=$(grep "REDIS_PASSWORD=" .env | cut -d'=' -f2)

        mkdir -p "$STORAGE_ROOT/mongodb" "$STORAGE_ROOT/redis" "$STORAGE_ROOT/qdrant" "$STORAGE_ROOT/cowrie/log" "$STORAGE_ROOT/cowrie/downloads"
        docker compose -f "$INFRA_COMPOSE" up -d
        if [ $? -ne 0 ]; then echo "❌ Failed to start Docker containers."; exit 1; fi
    fi
fi

# 3. Registrazione Systemd Service
if [ -f "$SERVICE_NAME.service" ]; then
    echo "⚙️  Registering systemd service..."
    sudo cp "$WORKING_DIR/$SERVICE_NAME.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    sudo systemctl restart "$SERVICE_NAME"
fi

# 4. Configurazione Nginx (se installato)
if command -v nginx > /dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
    NGINX_CONF="/etc/nginx/sites-available/$SERVICE_NAME.conf"
    if [ -f "proxy/$SERVICE_NAME.conf" ]; then
        echo "⚙️  Configuring Nginx proxy..."
        sudo cp "proxy/$SERVICE_NAME.conf" "$NGINX_CONF"
        sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
    fi
else
    echo "⚠️  Nginx not found, skipping proxy configuration."
fi

echo "✨ Installation complete for $SERVICE_NAME!"
# Cleanup template
rm -f "env.template" 2>/dev/null
sudo systemctl status "$SERVICE_NAME" --no-pager -l
