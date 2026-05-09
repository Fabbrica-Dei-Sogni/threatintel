#!/bin/bash

# ThreatIntel Bundle Installer (Production Ready)
# Gestisce: Docker Infra, Storage, Systemd, Nginx.

WORKING_DIR=$(pwd)
SERVICE_NAME=${1:-"$(basename $WORKING_DIR)"}
STORAGE_DEFAULT="/opt/threatintel/data"

echo "============================================================"
echo "🎯 Installing ThreatIntel Service: $SERVICE_NAME"
echo "📍 Source Path: $WORKING_DIR"
echo "============================================================"

# --- Phase 0: Pre-flight Checks & Discovery ---
echo "🔍 Checking requirements & discovering infrastructure..."

check_cmd() {
    if command -v "$1" &> /dev/null; then
        return 0
    fi
    # Prova a cercare in /usr/sbin (comune per nginx)
    if [ -f "/usr/sbin/$1" ] || [ -f "/sbin/$1" ]; then
        return 0
    fi
    return 1
}

# Requisiti essenziali (FAIL se mancano)
ESSENTIAL_TOOLS="docker node"
for tool in $ESSENTIAL_TOOLS; do
    if ! check_cmd "$tool"; then
        echo "❌ Error: Essential tool '$tool' is not installed."
        exit 1
    fi
done

# Requisiti opzionali (WARN se mancano)
HAS_NGINX=true
if ! check_cmd "nginx"; then
    echo "⚠️  Warning: nginx is not installed. Nginx configuration phase will be skipped."
    HAS_NGINX=false
fi

# Verifica specifica per Docker Compose V2 (plugin)
if ! docker compose version &> /dev/null; then
    echo "❌ Error: 'docker compose' (V2) is not available. Please install the Docker Compose plugin."
    exit 1
fi

# Discovery: Controlliamo se i servizi Docker sono già gestiti esternamente
INFRA_ALREADY_RUNNING=false
if docker ps --format '{{.Names}}' | grep -qE "mongodb-threatintel|redis-threatintel|qdrant-threatintel|cowrie-honeypot"; then
    INFRA_ALREADY_RUNNING=true
    echo "ℹ️  Detectata infrastruttura Docker già attiva. Salto la fase di provisioning infra."
fi

echo "✅ Pre-flight checks completed."

# --- Phase 1: Infrastructure & Storage (Conditional) ---
if [ "$INFRA_ALREADY_RUNNING" = false ]; then
    echo "------------------------------------------------------------"
    echo "🐳 Configuring Docker Infrastructure (Green Field Install)..."

    read -p "📂 Inserisci il path per lo storage dei dati ($STORAGE_DEFAULT): " STORAGE_ROOT
    STORAGE_ROOT=${STORAGE_ROOT:-$STORAGE_DEFAULT}

    echo "📁 Provisioning storage directories in $STORAGE_ROOT..."
    sudo mkdir -p "$STORAGE_ROOT"/{mongodb,redis,qdrant,cowrie/log,cowrie/downloads}
    sudo chown -R $USER:$USER "$STORAGE_ROOT"

    # Generazione del file .env per Docker e App
    ENV_TEMPLATE="$WORKING_DIR/env.template"
    if [ -f "$ENV_TEMPLATE" ]; then
        echo "📝 Generating .env from template..."
        sed -e "s|{{STORAGE_ROOT}}|$STORAGE_ROOT|g" \
            -e "s|{{PORT}}|3999|g" \
            -e "s|{{APP_DOMAIN}}|localhost|g" \
            -e "s|{{ALLOWED_ORIGINS}}|*|g" \
            -e "s|{{VERSION}}|1.0.0|g" \
            -e "s|{{APP_ID}}|app-$SERVICE_NAME-id|g" \
            -e "s|{{MONGO_ROOT_USER}}|admin|g" \
            -e "s|{{MONGO_ROOT_PWD}}|!!!AdminMongo!!!|g" \
            -e "s|{{MONGO_APP_USER}}|intelagent|g" \
            -e "s|{{MONGO_APP_PWD}}|intelagent|g" \
            -e "s|{{MONGO_APP_DB}}|threatinteldb|g" \
            -e "s|{{MONGO_APP_DB}}|threatinteldb|g" \
            -e "s|{{REDIS_PASSWORD}}|${REDIS_PASSWORD:-!!!HoneyPotRedis!!!}|g" \
            -e "s|{{RAG_COLLECTION_NAME}}|threat_intelligence|g" \
            -e "s|{{RAG_LOGS_COLLECTION_NAME}}|threat_logs|g" \
            -e "s|{{RAG_ENABLED}}|true|g" \
            -e "s|{{OLLAMA_URL}}|http://82.112.255.186:11434|g" \
            -e "s|{{SUMMARY_MODEL}}|gemma3:1b|g" \
            -e "s|{{URI_DIGITAL_AUTH}}|https://localhost:3443/auth/api/v1|g" \
            -e "s|{{ALLOW_ANONYMOUS}}|true|g" \
            "$ENV_TEMPLATE" > "$WORKING_DIR/.env"
        
        # Aggiunta porte Cowrie al .env (non presenti nel template base per pulizia app)
        echo "COWRIE_TELNET_BIND=${COWRIE_TELNET_BIND:-23:2223}" >> "$WORKING_DIR/.env"
    fi

    # Avvio infrastruttura Docker
    if [ -f "docker-compose.infra.yml" ]; then
        echo "🚀 Starting Docker containers..."
        export STORAGE_ROOT=$STORAGE_ROOT
        docker compose -f docker-compose.infra.yml up -d
        if [ $? -ne 0 ]; then
            echo "❌ Failed to start Docker containers."
            exit 1
        fi
        echo "✅ Infrastructure is UP."
    fi
else
    echo "------------------------------------------------------------"
    echo "ℹ️  Skipping Infrastructure setup (using existing Docker services)."
    if [ ! -f ".env" ]; then
        echo "⚠️  Attenzione: Infrastruttura attiva ma manca il file .env per il backend."
        if [ -f "env.template" ]; then
             echo "📝 Genero un .env di base da template..."
             sed -e "s|{{STORAGE_ROOT}}|./data|g" \
                 -e "s|{{PORT}}|3999|g" \
                 -e "s|{{APP_DOMAIN}}|localhost|g" \
                 -e "s|{{ALLOWED_ORIGINS}}|*|g" \
                 -e "s|{{VERSION}}|1.0.0|g" \
                 -e "s|{{APP_ID}}|app-$SERVICE_NAME-id|g" \
                 -e "s|{{MONGO_ROOT_USER}}|admin|g" \
                 -e "s|{{MONGO_ROOT_PWD}}|!!!AdminMongo!!!|g" \
                 -e "s|{{MONGO_APP_USER}}|intelagent|g" \
                 -e "s|{{MONGO_APP_PWD}}|intelagent|g" \
                 -e "s|{{MONGO_APP_DB}}|threatinteldb|g" \
                 -e "s|{{REDIS_PASSWORD}}|!!!HoneyPotRedis!!!|g" \
                 -e "s|{{RAG_COLLECTION_NAME}}|threat_intelligence|g" \
                 -e "s|{{RAG_LOGS_COLLECTION_NAME}}|threat_logs|g" \
                 -e "s|{{RAG_ENABLED}}|true|g" \
                 -e "s|{{OLLAMA_URL}}|http://82.112.255.186:11434|g" \
                 -e "s|{{SUMMARY_MODEL}}|gemma3:1b|g" \
                 -e "s|{{URI_DIGITAL_AUTH}}|https://localhost:3443/auth/api/v1|g" \
                 -e "s|{{ALLOW_ANONYMOUS}}|true|g" \
                 "env.template" > "$WORKING_DIR/.env"
        fi
    else
        echo "✅ File .env esistente preservato."
    fi
fi

# --- Phase 2: Systemd Registration ---
echo "------------------------------------------------------------"
echo "⚙️  Configuring Systemd service..."

if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "🔄 Il servizio $SERVICE_NAME è già attivo. Lo fermo..."
    sudo systemctl stop "$SERVICE_NAME"
fi

SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
# Il file .service dovrebbe essere stato generato dal build/deployer
# Se non c'è, proviamo a usare il template se presente
if [ ! -f "$WORKING_DIR/$SERVICE_NAME.service" ] && [ -f "$WORKING_DIR/threatintel.service.template" ]; then
    echo "📝 Generating service file from template..."
    # Questa parte solitamente è fatta dal make-release, ma aggiungiamo un fallback base
    sed -e "s|{{WORKING_DIR}}|$WORKING_DIR|g" \
        -e "s|{{USER}}|$USER|g" \
        -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
        "$WORKING_DIR/threatintel.service.template" > "$WORKING_DIR/$SERVICE_NAME.service"
fi

if [ -f "$WORKING_DIR/$SERVICE_NAME.service" ]; then
    sudo ln -sf "$WORKING_DIR/$SERVICE_NAME.service" "$SERVICE_FILE"
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    echo "✅ Servizio systemd registrato."
else
    echo "⚠️  Service file not found. Skipping systemd."
fi

# --- Phase 3: Nginx Configuration ---
if [ "$HAS_NGINX" = true ]; then
    read -p "🌐 Vuoi configurare Nginx? [y/N]: " DO_NGINX
    if [[ "$DO_NGINX" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        PROXY_DIR="$WORKING_DIR/proxy"
        GLOBAL_CONF="$PROXY_DIR/threatintel_globals_$SERVICE_NAME.conf"
        VHOST_CONF="$PROXY_DIR/$SERVICE_NAME.conf"

        if [ -f "$GLOBAL_CONF" ]; then
            sudo ln -sf "$GLOBAL_CONF" "/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf"
        fi
        if [ -f "$VHOST_CONF" ]; then
            sudo ln -sf "$VHOST_CONF" "/etc/nginx/sites-available/$SERVICE_NAME.conf"
            sudo ln -sf "/etc/nginx/sites-available/$SERVICE_NAME.conf" "/etc/nginx/sites-enabled/$SERVICE_NAME.conf"
        fi

        if sudo nginx -t; then
            sudo systemctl reload nginx
            echo "✅ Nginx configurato."
        else
            echo "❌ Errore Nginx. Rimuovo link..."
            sudo rm -f "/etc/nginx/conf.d/threatintel_globals_$SERVICE_NAME.conf" "/etc/nginx/sites-enabled/$SERVICE_NAME.conf"
        fi
    fi
else
    echo "ℹ️  Skipping Nginx phase (nginx not found)."
fi

# --- Phase 4: Start ---
echo "------------------------------------------------------------"
echo "🚀 Starting $SERVICE_NAME..."
sudo systemctl start "$SERVICE_NAME"

echo "✨ Installation complete!"
# Cleanup template if it exists
rm -f "$WORKING_DIR/env.template" 2>/dev/null
sudo systemctl status "$SERVICE_NAME" --no-pager -l
