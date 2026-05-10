#!/bin/bash

# ThreatIntel Frontend - Workspace Cleaner
# Rimuove gli artifact e le cartelle di deployment temporanee.

FRONTEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
ARTIFACT_DIR="$FRONTEND_ROOT/artifact"
DEPLOY_DIR="$FRONTEND_ROOT/deployments"

echo "🧹 Pulizia workspace release frontend..."

# Rimozoine artifact
if [ -d "$ARTIFACT_DIR" ]; then
    echo "🗑️  Rimozione artifact..."
    rm -rf "$ARTIFACT_DIR"/*
fi

# Rimozione deployments temporanei
if [ -d "$DEPLOY_DIR" ]; then
    echo "🗑️  Rimozione cartelle deployments..."
    # Rimuoviamo solo le cartelle create dal manager, non eventuali altre configurazioni
    rm -rf "$DEPLOY_DIR/threatintel-frontend"
    rm -rf "$DEPLOY_DIR/test-installation"
fi

echo "✅ Workspace pulito."
