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
echo "✅ Parametri configurati. Avvio build autonoma..."

# 2. Esecuzione Build Autonoma
# Passiamo tutti i parametri a make-release.sh
cd "$(dirname "${BASH_SOURCE[0]}")"
./make-release.sh "$RELEASE_VERSION" "$SERVICE_NAME" "$DEPLOY_PORT" "$DEPLOY_USER" "$DEPLOY_ENV" "$DEPLOY_DESC"

if [ $? -ne 0 ]; then
    echo "❌ Errore durante la build."
    exit 1
fi

DEPLOY_PATH="$PROJECT_ROOT/deployments/$SERVICE_NAME"

echo "------------------------------------------------------------"
# 3. Registrazione Servizio (Opzionale)
read -p "🚀 Vuoi registrare e avviare il servizio systemd ora? [y/N]: " DO_INSTALL
if [[ "$DO_INSTALL" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "⚙️  Installazione servizio in corso..."
    cd "$DEPLOY_PATH"
    ./install.sh "$SERVICE_NAME"
    echo ""
    echo "✨ Servizio configurato e avviato!"
else
    echo "✅ Release preparata in deployments/$SERVICE_NAME."
    echo "💡 Puoi attivarla in seguito entrando nella cartella ed eseguendo ./install.sh"
fi
