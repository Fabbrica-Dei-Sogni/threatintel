#!/bin/bash

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
DEFAULT_SERVICE="threatintel-release"
DEFAULT_USER=$(whoami)
DEFAULT_PORT="3999"
DEFAULT_ENV="production"
DEFAULT_DESC="Threat Intelligence Logger (Release Bundle)"

# Get version from package.json
PKG_VERSION=$(grep '"version":' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
DEFAULT_VERSION=${PKG_VERSION:-"0.0.1"}

echo "🚀 [Interactive Release] Benvenuto nel generatore di release."
echo "Premi INVIO per accettare il valore di default tra parentesi."
echo "------------------------------------------------------------"

# 0. Versione
read -p "🏷️  Versione della Release ($DEFAULT_VERSION): " RELEASE_VERSION
RELEASE_VERSION=${RELEASE_VERSION:-$DEFAULT_VERSION}

# 1. Interazione con l'utente
read -p "📛 Nome del Servizio ($DEFAULT_SERVICE): " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-$DEFAULT_SERVICE}

read -p "👤 Utente Linux ($DEFAULT_USER): " DEPLOY_USER
DEPLOY_USER=${DEPLOY_USER:-$DEFAULT_USER}

read -p "🌐 Porta ($DEFAULT_PORT): " DEPLOY_PORT
DEPLOY_PORT=${DEPLOY_PORT:-$DEFAULT_PORT}

read -p "🌍 NODE_ENV ($DEFAULT_ENV): " DEPLOY_ENV
DEPLOY_ENV=${DEPLOY_ENV:-$DEFAULT_ENV}

read -p "📝 Descrizione ($DEFAULT_DESC): " DEPLOY_DESC
DEPLOY_DESC=${DEPLOY_DESC:-$DEFAULT_DESC}

echo "------------------------------------------------------------"
echo "✅ Parametri configurati:"
echo "   - Servizio: $SERVICE_NAME"
echo "   - Utente:   $DEPLOY_USER"
echo "   - Porta:    $DEPLOY_PORT"
echo "   - Env:      $DEPLOY_ENV"
echo "------------------------------------------------------------"

# 2. Esecuzione Build
echo "🏗️  Avvio generazione release bundle v$RELEASE_VERSION..."
# Esegue make-release.sh assicurandosi che la directory corrente sia quella dello script
cd "$(dirname "${BASH_SOURCE[0]}")"
./make-release.sh "$RELEASE_VERSION"
if [ $? -ne 0 ]; then
    echo "❌ Errore durante la build. Esco."
    exit 1
fi

echo "------------------------------------------------------------"
# 3. Estrazione Bundle (Sempre eseguita)
echo "📦 Estrazione bundle nella cartella dedicata: deployments/$SERVICE_NAME"
DEPLOY_PATH="$PROJECT_ROOT/deployments/$SERVICE_NAME"
mkdir -p "$DEPLOY_PATH"

# Trova l'ultimo tar.gz generato nella cartella artifact
LATEST_TAR=$(ls -t "$PROJECT_ROOT"/artifact/threatintel-bundle-*.tar.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_TAR" ]; then
    echo "❌ Impossibile trovare l'archivio generato in $PROJECT_ROOT/artifact."
    exit 1
fi

tar -xzf "$LATEST_TAR" -C "$DEPLOY_PATH"
echo "✅ Bundle estratto in $DEPLOY_PATH"

echo "------------------------------------------------------------"
# 4. Parametrizzazione Servizio (Nuova logica: il file è pronto SUBITO dopo il deploy)
echo "⚙️  Parametrizzazione file di servizio e proxy..."
TEMPLATE_FILE="$DEPLOY_PATH/threatintel.service.template"
FINAL_SERVICE_FILE="$DEPLOY_PATH/$SERVICE_NAME.service"

# Riferimenti Nginx nel bundle
PROXY_DIR="$DEPLOY_PATH/proxy"

# Rilevamento Node.js (Eseguito sulla macchina di deploy)
NODE_PATH=$(which node)
NODE_BIN_DIR=$(dirname "$NODE_PATH")

# 1. Risoluzione Systemd Service
if [ -f "$TEMPLATE_FILE" ]; then
    sed -e "s|{{WORKING_DIR}}|$DEPLOY_PATH|g" \
        -e "s|{{USER}}|$DEPLOY_USER|g" \
        -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
        -e "s|{{PORT}}|$DEPLOY_PORT|g" \
        -e "s|{{NODE_ENV}}|$DEPLOY_ENV|g" \
        -e "s|{{DESCRIPTION}}|$DEPLOY_DESC|g" \
        -e "s|{{VERSION}}|$RELEASE_VERSION|g" \
        -e "s|{{NODE_PATH}}|$NODE_PATH|g" \
        -e "s|{{NODE_BIN_DIR}}|$NODE_BIN_DIR|g" \
        "$TEMPLATE_FILE" > "$FINAL_SERVICE_FILE"
    rm "$TEMPLATE_FILE"
    echo "✅ File di servizio creato: $SERVICE_NAME.service"
fi

# 2. Risoluzione Nginx Globals
if [ -f "$PROXY_DIR/nginx_globals.template" ]; then
    sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" "$PROXY_DIR/nginx_globals.template" > "$PROXY_DIR/threatintel_globals_$SERVICE_NAME.conf"
    rm "$PROXY_DIR/nginx_globals.template"
    echo "✅ Globals Nginx parametrizzati."
fi

# 3. Risoluzione Nginx Vhost
if [ -f "$PROXY_DIR/nginx_vhost.template" ]; then
    sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
        -e "s|{{PORT}}|$DEPLOY_PORT|g" \
        "$PROXY_DIR/nginx_vhost.template" > "$PROXY_DIR/$SERVICE_NAME.conf"
    rm "$PROXY_DIR/nginx_vhost.template"
    echo "✅ Vhost Nginx parametrizzato."
fi

echo "------------------------------------------------------------"
# 5. Registrazione Servizio (Opzionale)
read -p "🚀 Vuoi registrare e avviare il servizio systemd ora? [y/N]: " DO_INSTALL
if [[ "$DO_INSTALL" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "⚙️  Installazione servizio in corso..."
    cd "$DEPLOY_PATH"
    
    # L'installer ora è molto più semplice, riceve solo il nome del servizio
    ./install.sh "$SERVICE_NAME"
    
    echo ""
    echo "✨ Servizio configurato e avviato!"
    echo "👉 Status: sudo systemctl status $SERVICE_NAME"
else
    echo "✅ Release preparata in deployments/$SERVICE_NAME."
    echo "💡 Il file di servizio è già pronto. Puoi attivarlo in seguito con install.sh o manualmente."
fi
