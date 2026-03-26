#!/bin/bash

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
DEFAULT_SERVICE="threatintel-release"
DEFAULT_USER=$(whoami)
DEFAULT_PORT="3999"
DEFAULT_ENV="production"
DEFAULT_DESC="Threat Intelligence Logger (Release Bundle)"

echo "🚀 [Interactive Release] Benvenuto nel generatore di release."
echo "Premi INVIO per accettare il valore di default tra parentesi."
echo "------------------------------------------------------------"

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
echo "🏗️  Avvio generazione release bundle..."
# Esegue make-release.sh assicurandosi che la directory corrente sia quella dello script
cd "$(dirname "${BASH_SOURCE[0]}")"
./make-release.sh
if [ $? -ne 0 ]; then
    echo "❌ Errore durante la build. Esco."
    exit 1
fi

echo "------------------------------------------------------------"
read -p "🚀 Vuoi installare questa release localmente sul sistema? [y/N]: " DO_INSTALL
if [[ "$DO_INSTALL" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "📦 Estrazione e installazione in corso..."
    mkdir -p "$PROJECT_ROOT/.test_deploy"
    
    # Trova l'ultimo tar.gz generato nella cartella artifact
    LATEST_TAR=$(ls -t "$PROJECT_ROOT"/artifact/threatintel-bundle-*.tar.gz | head -n 1)
    
    if [ -z "$LATEST_TAR" ]; then
        echo "❌ Impossibile trovare l'archivio generato in $PROJECT_ROOT."
        exit 1
    fi
    
    echo "📦 Utilizzo archivio: $(basename "$LATEST_TAR")"
    tar -xzf "$LATEST_TAR" -C "$PROJECT_ROOT/.test_deploy"
    cd "$PROJECT_ROOT/.test_deploy"
    
    # Esegue l'installer con i parametri raccolti
    PORT=$DEPLOY_PORT NODE_ENV=$DEPLOY_ENV DESC="$DEPLOY_DESC" ./install.sh "$SERVICE_NAME" "$DEPLOY_USER"
    
    echo ""
    echo "✨ Installazione completata con successo in: $PROJECT_ROOT/.test_deploy"
    echo "👉 Per gestire il servizio: sudo systemctl status $SERVICE_NAME"
else
    echo "✅ Release completata. L'archivio è pronto nella root del progetto."
fi
