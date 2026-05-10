#!/bin/bash

# ThreatIntel Frontend - Interactive Release Manager
# Guida l'utente nella creazione di una nuova release.

FRONTEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
BUILD_SCRIPT="$FRONTEND_ROOT/installer/build/make-release.sh"
DASHBOARD_SRC="$FRONTEND_ROOT/dashboard"

echo "✨ ThreatIntel Frontend - Interactive Release"
echo "============================================================"

# Rilevamento versione attuale
CURRENT_VERSION=$(grep '"version":' "$DASHBOARD_SRC/package.json" | cut -d'"' -f4)

echo "📦 Versione rilevata nel codice: $CURRENT_VERSION"
read -p "Confermi di voler creare la release v$CURRENT_VERSION? [y/N]: " CONFIRM

if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    chmod +x "$BUILD_SCRIPT"
    "$BUILD_SCRIPT"
else
    echo "❌ Operazione annullata."
    exit 0
fi
