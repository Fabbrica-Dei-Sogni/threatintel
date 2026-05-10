#!/bin/bash

# ThreatIntel - Interactive Production Installer
# Questo script viene eseguito sulla macchina di destinazione dal cliente.

WORKING_DIR=$(pwd)
SERVICE_NAME=${1:-"$(basename $(pwd))"}

# --- Helper Functions ---

# Verifica se una porta è occupata (TCP o UDP)
check_port() {
    local port=$1
    if ss -tulpn | grep -q ":$port " ; then
        return 1 # Occupata
    else
        return 0 # Libera
    fi
}

# Funzione helper per caricare variabili dal .env in modo robusto
get_env_val() {
    grep "^$1=" .env 2>/dev/null | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

# --- Main Logic ---

# Evitiamo nomi generici se lanciato per errore da cartelle comuni o non idonee
if [ -z "$SERVICE_NAME" ] || [ "$SERVICE_NAME" = "deploy" ] || [ "$SERVICE_NAME" = "installer" ] || [ "$SERVICE_NAME" = "." ]; then
    echo "❌ Errore: Nome servizio '$SERVICE_NAME' non valido o mancante."
    echo "Specificalo esplicitamente: ./install.sh mio-servizio"
    exit 1
fi

echo "🚀 Avvio installazione per: $SERVICE_NAME"
echo "============================================================"

# 1. Wizard di Configurazione
RUN_WIZARD=true
if [ -f "$WORKING_DIR/.env" ]; then
    echo "ℹ️  Configurazione esistente rilevata (.env)."
    read -p "🔄 Vuoi eseguire nuovamente il wizard di configurazione (RESET AI DEFAULT)? (y/n) [n]: " REWIZARD
    if [[ ! "$REWIZARD" =~ ^[Yy]$ ]]; then
        RUN_WIZARD=false
        echo "✅ Utilizzo le impostazioni esistenti."
        
        # Caricamento variabili (Mapping esatto tra nomi .env e nomi script)
        APP_DOMAIN=$(get_env_val "APP_DOMAIN")
        DEPLOY_PORT=$(get_env_val "PORT")
        API_BASE_URL=$(get_env_val "API_BASE_URL")
        APP_STORAGE=$(get_env_val "STORAGE_ROOT")
        MONGO_PORT=$(get_env_val "MONGO_PORT")
        REDIS_PORT=$(get_env_val "REDIS_PORT")
        REDIS_PWD=$(get_env_val "REDIS_PASSWORD")
        QDRANT_PORT=$(get_env_val "QDRANT_PORT")
        APP_ID=$(get_env_val "APP_ID")
        ALLOWED_ORIGINS=$(get_env_val "ALLOWED_ORIGINS")
        URI_DIGITAL_AUTH=$(get_env_val "URI_DIGITAL_AUTH")
        
        # Per Cowrie Telnet port
        COWRIE_BIND=$(get_env_val "COWRIE_TELNET_BIND")
        TELNET_P=$(echo "$COWRIE_BIND" | cut -d':' -f1)
        [ -z "$TELNET_P" ] && TELNET_P="23"
        
        # Caricamento descrizione dal file di servizio se esiste
        SERVICE_DESC=$(grep "Description=" "/etc/systemd/system/$SERVICE_NAME.service" 2>/dev/null | cut -d'=' -f2)
        [ -z "$SERVICE_DESC" ] && SERVICE_DESC="Threat Intelligence Logger - $SERVICE_NAME"
        
        # Rigenerazione path relativi per Nginx
        API_REL_PATH=$(echo "$API_BASE_URL" | sed -E 's|https?://[^/]+||')
        [ -z "$API_REL_PATH" ] && API_REL_PATH="/"
        API_REL_PATH=${API_REL_PATH%/}
    fi
fi

if [ "$RUN_WIZARD" = true ]; then
    CONFIRMED=false
    
    while [ "$CONFIRMED" = false ]; do
        echo "📝 Configurazione del servizio (Default di fabbrica). Rispondi alle seguenti domande:"
        echo "------------------------------------------------------------"
        
        # Factory Defaults
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

        while true; do
            read -p "🌐 Porta locale del servizio [$DEFAULT_PORT]: " DEPLOY_PORT
            DEPLOY_PORT=${DEPLOY_PORT:-$DEFAULT_PORT}
            if check_port "$DEPLOY_PORT"; then break; else echo "⚠️  Porta $DEPLOY_PORT già in uso! Scegline un'altra."; fi
        done

        read -p "📂 Base Path (es. /honeypot) [INVIO per root /]: " APP_BASE_PATH
        APP_BASE_PATH=${APP_BASE_PATH:-""}

        # Normalizzazione Base Path
        CLEAN_BASE_PATH=$APP_BASE_PATH
        if [[ -n "$CLEAN_BASE_PATH" && "$CLEAN_BASE_PATH" != /* ]]; then CLEAN_BASE_PATH="/$CLEAN_BASE_PATH"; fi
        CLEAN_BASE_PATH=${CLEAN_BASE_PATH%/}

        DYNAMIC_API_BASE="https://$APP_DOMAIN$CLEAN_BASE_PATH/api"
        read -p "🔗 API Base URL ($DYNAMIC_API_BASE): " API_BASE_URL
        API_BASE_URL=${API_BASE_URL:-$DYNAMIC_API_BASE}
        
        # Estrazione Path Relativo per Nginx (Biunivocità)
        API_REL_PATH=$(echo "$API_BASE_URL" | sed -E 's|https?://[^/]+||')
        [ -z "$API_REL_PATH" ] && API_REL_PATH="/"
        API_REL_PATH=${API_REL_PATH%/} # Rimuove slash finale se presente
        echo ""

        echo "📂 INFRASTRUTTURA"
        DEFAULT_STORAGE="$WORKING_DIR/storage"
        read -p "📂 Percorso Storage Locale [$DEFAULT_STORAGE]: " APP_STORAGE
        APP_STORAGE=${APP_STORAGE:-$DEFAULT_STORAGE}

        while true; do
            read -p "🍃 Porta MongoDB [17017]: " MONGO_PORT
            MONGO_PORT=${MONGO_PORT:-17017}
            if check_port "$MONGO_PORT"; then break; else echo "⚠️  Porta $MONGO_PORT già in uso! Scegline un'altra."; fi
        done

        while true; do
            read -p "🚩 Porta Redis [6379]: " REDIS_PORT
            REDIS_PORT=${REDIS_PORT:-6379}
            if check_port "$REDIS_PORT"; then break; else echo "⚠️  Porta $REDIS_PORT già in uso! Scegline un'altra."; fi
        done

        while true; do
            read -p "💎 Porta Qdrant [6333]: " QDRANT_PORT
            QDRANT_PORT=${QDRANT_PORT:-6333}
            if check_port "$QDRANT_PORT"; then break; else echo "⚠️  Porta $QDRANT_PORT già in uso! Scegline un'altra."; fi
        done
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
        while true; do
            read -p "📡 Porta Honeypot TELNET [$DEFAULT_TELNET_P]: " TELNET_P
            TELNET_P=${TELNET_P:-$DEFAULT_TELNET_P}
            if check_port "$TELNET_P"; then break; else echo "⚠️  Porta $TELNET_P già in uso! Scegline un'altra."; fi
        done
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
        echo "  Infra Ports:   Mongo:$MONGO_PORT, Redis:$REDIS_PORT, Qdrant:$QDRANT_PORT"
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
            -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
            -e "s|{{MONGO_ROOT_USER}}|admin|g" \
            -e "s|{{MONGO_ROOT_PWD}}|!!!AdminMongo!!!|g" \
            -e "s|{{MONGO_APP_USER}}|intelagent|g" \
            -e "s|{{MONGO_APP_PWD}}|intelagent|g" \
            -e "s|{{MONGO_APP_DB}}|threatinteldb|g" \
            -e "s|{{MONGO_PORT}}|$MONGO_PORT|g" \
            -e "s|{{REDIS_PORT}}|$REDIS_PORT|g" \
            -e "s|{{REDIS_PASSWORD}}|$REDIS_PWD|g" \
            -e "s|{{QDRANT_PORT}}|$QDRANT_PORT|g" \
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
            -e "s|{{MONGO_PORT}}|$MONGO_PORT|g" \
            -e "s|{{REDIS_PORT}}|$REDIS_PORT|g" \
            -e "s|{{QDRANT_PORT}}|$QDRANT_PORT|g" \
            -e "s|{{QDRANT_URL}}|http://127.0.0.1:$QDRANT_PORT|g" \
            -e "s|{{RAG_COLLECTION_NAME}}|threat_intelligence|g" \
            -e "s|{{RAG_LOGS_COLLECTION_NAME}}|threat_logs|g" \
            -e "s|{{OLLAMA_URL}}|$OLLAMA_URL|g" \
            -e "s|{{SUMMARY_MODEL}}|$SUMMARY_MODEL|g" \
            -e "s|{{EMBEDDING_MODEL}}|$EMBEDDING_MODEL|g" \
            "$TEMPLATE" > "$SERVICE_NAME.service"
    fi

    # Generazione configurazione Nginx
    if [ -f "proxy/nginx_vhost.conf.template" ]; then
        echo "⚙️  Generazione configurazione Nginx..."
        mkdir -p proxy
        VHOST_TMP="proxy/nginx_vhost.conf.template"
        
        sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
            -e "s|{{PORT}}|$DEPLOY_PORT|g" \
            -e "s|{{APP_DOMAIN}}|$APP_DOMAIN|g" \
            -e "s|{{API_BASE_URL}}|$API_BASE_URL|g" \
            -e "s|{{API_BASE_PATH}}|$API_REL_PATH|g" \
            -e "s|{{APP_BASE_PATH}}|$CLEAN_BASE_PATH|g" \
            "$VHOST_TMP" > "proxy/$SERVICE_NAME.conf"

        # Generazione Globali (Logging JSON)
        GLOBALS_TMP="proxy/nginx_globals.conf.template"
        if [ -f "$GLOBALS_TMP" ]; then
            echo "⚙️  Generazione globali Nginx (Logging JSON)..."
            sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
                "$GLOBALS_TMP" > "proxy/threatintel_globals_$SERVICE_NAME.conf"
        fi
    fi
fi

# 2. Requisiti & Infrastruttura Docker
echo "🔍 Checking Docker infrastructure..."
INFRA_COMPOSE="docker-compose.yml"

# Generazione Docker Compose Dinamico dal Template
if [ -f "docker-compose.infra.yml.template" ]; then
    echo "⚙️  Generazione Docker Compose dinamico..."
    sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
        -e "s|{{MONGO_PORT}}|$MONGO_PORT|g" \
        -e "s|{{REDIS_PORT}}|$REDIS_PORT|g" \
        -e "s|{{QDRANT_PORT}}|$QDRANT_PORT|g" \
        -e "s|{{TELNET_PORT}}|$TELNET_P|g" \
        "docker-compose.infra.yml.template" > "$INFRA_COMPOSE"
fi

if [ -f "$INFRA_COMPOSE" ]; then
    # Verifica se l'infrastruttura è già attiva per questo specifico servizio
    # Usiamo un filtro esatto per il nome del container
    SPECIFIC_INFRA_RUNNING=$(docker ps -q --filter "name=^/mongodb-$SERVICE_NAME$" | wc -l)
    
    if [ "$SPECIFIC_INFRA_RUNNING" -ge 1 ]; then
        echo "ℹ️  Dedicated infrastructure for $SERVICE_NAME detected and running."
    else
        echo "🚀 Preparing Docker infrastructure for $SERVICE_NAME..."
        
        # Cleanup preventivo per evitare conflitti di nomi orfani o reti
        echo "🧹 Checking for orphan containers or network conflicts..."
        docker compose down --remove-orphans >/dev/null 2>&1
        
        # Rimozione forzata di eventuali container rimasti con lo stesso nome (Docker bug safety)
        docker rm -f "mongodb-$SERVICE_NAME" "redis-$SERVICE_NAME" "qdrant-$SERVICE_NAME" "cowrie-$SERVICE_NAME" >/dev/null 2>&1

        # Carichiamo STORAGE_ROOT dal .env
        EXPORT_STORAGE=$(grep "STORAGE_ROOT=" .env | cut -d'=' -f2)
        export STORAGE_ROOT=${EXPORT_STORAGE:-$WORKING_DIR/storage}
        
        # Iniezione porte Cowrie per docker-compose (da .env)
        export COWRIE_TELNET_BIND=$(grep "COWRIE_TELNET_BIND=" .env | cut -d'=' -f2)
        export REDIS_PASSWORD=$(grep "REDIS_PASSWORD=" .env | cut -d'=' -f2)

        mkdir -p "$STORAGE_ROOT/mongodb" "$STORAGE_ROOT/redis" "$STORAGE_ROOT/qdrant" "$STORAGE_ROOT/cowrie/log" "$STORAGE_ROOT/cowrie/downloads"
        
        echo "🚀 Starting Docker containers..."
        docker compose up -d
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
    NGINX_VHOST_ENABLED="/etc/nginx/sites-enabled/$SERVICE_NAME.conf"
    NGINX_GLOBALS_CONF="/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf"
    
    if [ -f "proxy/$SERVICE_NAME.conf" ]; then
        echo "⚙️  Configuring Nginx proxy (via symbolic links)..."
        
        # 1. Link per i Globali (Logging JSON)
        if [ -f "proxy/threatintel_globals_$SERVICE_NAME.conf" ]; then
            sudo ln -sf "$WORKING_DIR/proxy/threatintel_globals_$SERVICE_NAME.conf" "$NGINX_GLOBALS_CONF"
        fi

        # 2. Link per il Vhost
        sudo ln -sf "$WORKING_DIR/proxy/$SERVICE_NAME.conf" "$NGINX_VHOST_ENABLED"
        
        # Verifica e ricarica
        sudo nginx -t && sudo systemctl reload nginx
    fi
else
    echo "⚠️  Nginx not found, skipping proxy configuration."
fi

echo "✨ Installation complete for $SERVICE_NAME!"
# Cleanup template
rm -f "env.template" 2>/dev/null
sudo systemctl status "$SERVICE_NAME" --no-pager -l
