#!/bin/bash

# Wizard di configurazione generato automaticamente
# NON MODIFICARE DIRETTAMENTE QUESTO FILE

run_config_wizard() {
    CONFIRMED=false
    while [ "$CONFIRMED" = false ]; do
        echo "📝 Configurazione iniziale rilevata. Rispondi alle seguenti domande:"
        echo "------------------------------------------------------------"

        # 1. Esportazione Default iniziali (per variabili senza prompt)
        export PORT="3999"
        export APP_DOMAIN="localhost"
        export APP_BASE_PATH=""
        export API_BASE_URL=""
        export ALLOWED_ORIGINS="*"
        export APP_ID="honeypot-host-001"
        export VERSION="1.0.0"
        export LOG_LEVEL="info"
        export STORAGE_ROOT="$WORKING_DIR/storage"
        export MONGO_URI="mongodb://intelagent:intelagent@localhost:17017/threatinteldb"
        export REDIS_HOST="127.0.0.1"
        export REDIS_PORT="6379"
        export REDIS_PASSWORD="!!!HoneyPotRedis!!!"
        export REDIS_DB="0"
        export REDIS_CONNECT_TIMEOUT_MS="2000"
        export REDIS_COMMAND_TIMEOUT_MS="2000"
        export REDIS_RETRY_DELAY_MS="500"
        export REDIS_MAX_RETRY_DELAY_MS="5000"
        export RAG_ENABLED="true"
        export OLLAMA_URL="http://localhost:11434"
        export SUMMARY_MODEL="gemma3:1b"
        export EMBEDDING_MODEL="nomic-embed-text"
        export RAG_AI_SUMMARY_ENABLED="true"
        export QDRANT_URL="http://127.0.0.1:6333"
        export EXCLUDED_IPS="127.0.0.1,::1,localhost"
        export ABUSEIPDB_KEY=""
        export IPINFO_TOKEN=""
        export IP_CACHE_MAX_AGE_HOURS="24"
        export HONEYPOT_INSTANCE_ID="honeypot-host-001"
        export TELNET_P="23"
        export URI_DIGITAL_AUTH="https://alessandromodica.com:3443/auth/api/v1"
        export ALLOW_ANONYMOUS="true"
        export ANONYMOUS_ROLE="viewer"
        export AUTH_STRICT_SSL="true"
        export DDOS_WINDOW_MS="60000"
        export DDOS_MAX_REQUESTS="100"
        export MAX_VIOLATIONS="5"
        export BLACKLIST_DURATION="7200"
        export LOG_RATE_LIMIT_EVENTS="true"
        export HONEYPOT_DASHBOARD_PATH="/honeypot"
        export CRITICAL_WINDOW_MS="900000"
        export CRITICAL_MAX_REQUESTS="20"
        export TRAP_WINDOW_MS="300000"
        export TRAP_MAX_REQUESTS="50"
        export APP_WINDOW_MS="60000"
        export APP_MAX_REQUESTS="200"
        export PRUNING_INTERVAL="24h"
        export PRUNING_MAX_DAYS_THREAT_LOGS="30"
        export PRUNING_MAX_DAYS_SSH_LOGS="60"
        export PRUNING_MAX_DAYS_NGINX_LOGS="15"
        export PRUNING_MAX_DAYS_ATTACK_LOGS="90"
        export DANGER_WEIGHT_RPSNORM="0.18"
        export DANGER_WEIGHT_DURNORM="0.12"
        export DANGER_WEIGHT_SCORENORM="0.50"
        export DANGER_WEIGHT_UNIQUETECHNORM="0.20"
        export DANGER_WEIGHT_DISTRIBUTED="0.15"
        export ANALYZE_INTERVAL="5m"
        export NGINX_LOG_PREFIX="nginx_threat:"
        export COMMON_ENDPOINTS="/admin,/wp-admin,/phpmyadmin"
        echo ""

        # 2. Informazioni Generali (Legacy/Installer)
        echo "📦 INFORMAZIONI GENERALI"
        read -p "📛 Nome del Servizio [$SERVICE_NAME]: " NEW_SERVICE_NAME
        SERVICE_NAME=${NEW_SERVICE_NAME:-$SERVICE_NAME}
        DEFAULT_DESC="Threat Intelligence Logger - $SERVICE_NAME"
        read -p "📝 Descrizione del Servizio [$DEFAULT_DESC]: " SERVICE_DESC
        SERVICE_DESC=${SERVICE_DESC:-$DEFAULT_DESC}
        echo ""

        read -p "🌐 Porta locale del servizio [3999]: " VAL_PORT
        export PORT=${VAL_PORT:-"3999"}
        read -p "🌐 Dominio Applicazione [localhost]: " APP_DOMAIN
        APP_DOMAIN=${APP_DOMAIN:-"localhost"}
        read -p "📂 Base Path (es. /honeypot) [INVIO per root /]: " APP_BASE_PATH
        APP_BASE_PATH=${APP_BASE_PATH:-""}
        # Normalizzazione Base Path
        CLEAN_BASE_PATH=$APP_BASE_PATH
        if [[ -n "$CLEAN_BASE_PATH" && "$CLEAN_BASE_PATH" != /* ]]; then CLEAN_BASE_PATH="/$CLEAN_BASE_PATH"; fi
        CLEAN_BASE_PATH=${CLEAN_BASE_PATH%/}
        read -p "🛡️ Allowed Origins [*]: " VAL_ALLOWED_ORIGINS
        export ALLOWED_ORIGINS=${VAL_ALLOWED_ORIGINS:-"*"}
        # Calcolo APP_ID dinamico
        CLEAN_DOMAIN=$(echo "$APP_DOMAIN" | sed -e "s|https://||g" -e "s|http://||g" -e "s|/.*||g")
        [ -z "$CLEAN_DOMAIN" ] && CLEAN_DOMAIN="localhost"
        DEFAULT_APP_ID="com.$CLEAN_DOMAIN.$SERVICE_NAME"
        read -p "🆔 Application ID [$DEFAULT_APP_ID]: " APP_ID
        APP_ID=${APP_ID:-$DEFAULT_APP_ID}
        echo ""
        echo "📦 [Infrastructure] Settings"
        read -p "📂 Percorso Storage Locale [$WORKING_DIR/storage]: " VAL_STORAGE_ROOT
        export STORAGE_ROOT=${VAL_STORAGE_ROOT:-"$WORKING_DIR/storage"}
        echo ""
        echo "📦 [Redis] Settings"
        read -sp "🔑 Password per Redis [!!!HoneyPotRedis!!!]: " VAL_REDIS_PASSWORD
        echo ""
        export REDIS_PASSWORD=${VAL_REDIS_PASSWORD:-"!!!HoneyPotRedis!!!"}
        echo ""
        echo "🤖 INTELLIGENZA ARTIFICIALE (Ollama)"
        if [ "$APP_DOMAIN" = "localhost" ]; then SUGGESTED_OLLAMA="http://82.112.255.186:11434"; else SUGGESTED_OLLAMA="http://$APP_DOMAIN:11434"; fi
        read -p "🔗 Ollama URI [$SUGGESTED_OLLAMA]: " OLLAMA_URL
        OLLAMA_URL=${OLLAMA_URL:-$SUGGESTED_OLLAMA}
        read -p "🧠 Summary Model [gemma3:1b]: " VAL_SUMMARY_MODEL
        export SUMMARY_MODEL=${VAL_SUMMARY_MODEL:-"gemma3:1b"}
        read -p "🔡 Embedding Model [nomic-embed-text]: " VAL_EMBEDDING_MODEL
        export EMBEDDING_MODEL=${VAL_EMBEDDING_MODEL:-"nomic-embed-text"}
        echo ""
        echo "📦 [Security] Settings"
        read -p "📡 Honeypot Instance ID [honeypot-host-001]: " VAL_HONEYPOT_INSTANCE_ID
        export HONEYPOT_INSTANCE_ID=${VAL_HONEYPOT_INSTANCE_ID:-"honeypot-host-001"}
        read -p "📡 Porta Honeypot TELNET [23]: " VAL_TELNET_P
        export TELNET_P=${VAL_TELNET_P:-"23"}
        echo "🌐 RETE E ACCESSO"
        read -p "🔐 Digital Auth IdP URI [https://alessandromodica.com:3443/auth/api/v1]: " VAL_URI_DIGITAL_AUTH
        export URI_DIGITAL_AUTH=${VAL_URI_DIGITAL_AUTH:-"https://alessandromodica.com:3443/auth/api/v1"}

        echo ""
        echo "🧐 RIEPILOGO CONFIGURAZIONE:"
        echo "------------------------------------------------------------"
        echo "  Servizio:      $SERVICE_NAME ($SERVICE_DESC)"
        echo "  PORT          : ${PORT}"
        echo "  APP_DOMAIN    : ${APP_DOMAIN}"
        echo "  APP_BASE_PATH : ${APP_BASE_PATH}"
        echo "  API_BASE_URL  : ${API_BASE_URL}"
        echo "  ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}"
        echo "  APP_ID        : ${APP_ID}"
        echo "  STORAGE_ROOT  : ${STORAGE_ROOT}"
        echo "  REDIS_PASSWORD: ********"
        echo "  OLLAMA_URL    : ${OLLAMA_URL}"
        echo "  SUMMARY_MODEL : ${SUMMARY_MODEL}"
        echo "  EMBEDDING_MODEL: ${EMBEDDING_MODEL}"
        echo "  HONEYPOT_INSTANCE_ID: ${HONEYPOT_INSTANCE_ID}"
        echo "  TELNET_P      : ${TELNET_P}"
        echo "  URI_DIGITAL_AUTH: ${URI_DIGITAL_AUTH}"
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
            echo "🔄 Riavvio wizard..."
            echo ""
        fi
    done
}
