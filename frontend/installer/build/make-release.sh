#!/bin/bash

# ThreatIntel Frontend - Dashboard Manager
# Questo script crea un pacchetto di rilascio leggero che scarica il codice da Nexus.

FRONTEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
ARTIFACTS_DIR="$FRONTEND_ROOT/artifact"
DEPLOY_TEMPLATES="$FRONTEND_ROOT/installer/deploy"
DASHBOARD_SRC="$FRONTEND_ROOT/dashboard"

# 1. Rilevamento e Conferma Versione/Nome
DETECTED_VERSION=$(grep '"version":' "$DASHBOARD_SRC/package.json" | cut -d'"' -f4)
DEFAULT_SERVICE="threatintel-frontend"

echo "📝 Configurazione Release Dashboard:"
read -p "🔢 Versione [$DETECTED_VERSION]: " VERSION
VERSION=${VERSION:-$DETECTED_VERSION}

read -p "📛 Nome Servizio [$DEFAULT_SERVICE]: " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-$DEFAULT_SERVICE}

ARTIFACT_NAME="$SERVICE_NAME-dashboard-v$VERSION.tar.gz"

echo "🚀 Dashboard Release Builder: Building Release v$VERSION for $SERVICE_NAME..."

# 2. Setup Directory Temporanea
BUILD_DIR="$FRONTEND_ROOT/deployments/$SERVICE_NAME"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$ARTIFACTS_DIR"

# 3. Copia file minimi per il build Docker da Nexus
echo "📦 Copia file di configurazione e Dockerfile template..."
cp "$DEPLOY_TEMPLATES/Dockerfile.template" "$BUILD_DIR/Dockerfile"
cp "$DASHBOARD_SRC/nginx.conf" "$BUILD_DIR/"
cp "$DASHBOARD_SRC/.npmrc" "$BUILD_DIR/"
echo "$VERSION" > "$BUILD_DIR/VERSION"

# 4. Copia Script di Installazione e Template
echo "🛠️  Preparazione script di installazione..."
sed "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" "$DEPLOY_TEMPLATES/install.sh.template" > "$BUILD_DIR/install.sh"
cp "$DEPLOY_TEMPLATES/uninstall.sh.template" "$BUILD_DIR/uninstall.sh"
cp "$DEPLOY_TEMPLATES/docker-compose.yml.template" "$BUILD_DIR/"
cp "$DASHBOARD_SRC/entrypoint.sh" "$BUILD_DIR/"
cp "$DASHBOARD_SRC/config.js.template" "$BUILD_DIR/"

chmod +x "$BUILD_DIR/install.sh" "$BUILD_DIR/uninstall.sh"

# 5. Creazione Tarball Atomico
echo "🗜️  Creazione tarball: $ARTIFACT_NAME..."
cd "$FRONTEND_ROOT/deployments"
tar -czf "$ARTIFACTS_DIR/$ARTIFACT_NAME" "$SERVICE_NAME"

echo "------------------------------------------------------------"
echo "✅ Release DASHBOARD completata!"
echo "📦 Artifact: artifact/$ARTIFACT_NAME"
echo "📂 Deployment: deployments/$SERVICE_NAME"
echo "💡 Questo pacchetto scaricherà la versione $VERSION direttamente da Nexus durante l'installazione."
echo "------------------------------------------------------------"
