#!/bin/bash

# ThreatIntel - Developer Release Wizard
# Usato dall'azienda per preparare un pacchetto di distribuzione.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
DEFAULT_SERVICE="threatintel-$(date +%Y%m%d)"
PKG_VERSION=$(grep '"version":' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
DEFAULT_VERSION=${PKG_VERSION:-"1.0.0"}

echo "🏗️  [Release Wizard] Preparazione pacchetto di distribuzione"
echo "------------------------------------------------------------"

read -p "🏷️  Versione della Release ($DEFAULT_VERSION): " RELEASE_VERSION
RELEASE_VERSION=${RELEASE_VERSION:-$DEFAULT_VERSION}

read -p "📂 Nome del pacchetto/servizio ($DEFAULT_SERVICE): " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-$DEFAULT_SERVICE}

echo "------------------------------------------------------------"
echo "⚙️  Avvio build del pacchetto agnostico..."

cd "$(dirname "${BASH_SOURCE[0]}")"
./make-release.sh "$RELEASE_VERSION" "$SERVICE_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Pacchetto pronto."
    echo "📦 Puoi trovare il tar.gz nella cartella 'artifact/'"
    echo "🚀 Invia questo pacchetto al cliente. L'utente dovrà solo lanciare ./install.sh"
fi
