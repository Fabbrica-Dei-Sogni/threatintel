#!/bin/bash

# ThreatIntel - Generic Release Builder
# Questo script viene eseguito dallo SVILUPPATORE per creare il pacchetto di distribuzione.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
INSTALLER_DIR="$PROJECT_ROOT/installer"
BUILD_TMP="$PROJECT_ROOT/.build_tmp"

# Parametri base
VERSION=${1:-"1.0.0"}
SERVICE_NAME=${2:-"threatintel-release"}
DEPLOY_PATH="$PROJECT_ROOT/deployments/$SERVICE_NAME"
ARTIFACT_NAME="threatintel-bundle-$SERVICE_NAME-v$VERSION.tar.gz"

echo "🚀 Building Release v$VERSION for $SERVICE_NAME..."

# 1. Cleanup & Setup
rm -rf "$DEPLOY_PATH" "$BUILD_TMP"
mkdir -p "$DEPLOY_PATH/data" "$DEPLOY_PATH/infra" "$DEPLOY_PATH/proxy" "$DEPLOY_PATH/mongo-init" "$DEPLOY_PATH/cowrie/etc"
mkdir -p "$BUILD_TMP"

# 2. Compilazione e Generazione Configurazione
echo "⚙️  Generating configuration artifacts for version $VERSION..."
npx ts-node "$PROJECT_ROOT/core/config/generate-config-artifacts.ts" "$VERSION"

echo "🏗️  Bundling code with ncc..."
npx -y @vercel/ncc build "$PROJECT_ROOT/server.ts" -o "$BUILD_TMP"
if [ $? -ne 0 ]; then
    echo "❌ Errore durante la compilazione con ncc."
    exit 1
fi

cp "$BUILD_TMP/index.js" "$DEPLOY_PATH/"
echo "$VERSION" > "$DEPLOY_PATH/VERSION"

# 3. Copia Asset statici (GeoIP)
echo "🌍 Adding GeoIP data..."
cp "$PROJECT_ROOT"/node_modules/geoip-lite/data/*.dat "$DEPLOY_PATH/data/" 2>/dev/null

# 4. Copia Script e Template (Agnostici)
echo "📦 Adding templates and installer..."
cp "$INSTALLER_DIR/deploy/install.sh" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/uninstall.sh" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/config-wizard.sh" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/config-manifest.json" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/docker-compose.infra.yml" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/env.template" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/threatintel.service.template" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/nginx_vhost.conf.template" "$DEPLOY_PATH/proxy/"
cp "$INSTALLER_DIR/deploy/nginx_globals.conf.template" "$DEPLOY_PATH/proxy/"

# Script infra
cp "$PROJECT_ROOT/redis/check-redis.sh" "$DEPLOY_PATH/infra/"
cp "$PROJECT_ROOT/mongodb/check-mongodb.sh" "$DEPLOY_PATH/infra/"
cp "$PROJECT_ROOT/qdrant/check-qdrant.sh" "$DEPLOY_PATH/infra/"
cp -r "$PROJECT_ROOT/mongodb/mongo-init/"* "$DEPLOY_PATH/mongo-init/"
cp -r "$PROJECT_ROOT/cowrie/etc/"* "$DEPLOY_PATH/cowrie/etc/"

chmod +x "$DEPLOY_PATH/install.sh" "$DEPLOY_PATH/uninstall.sh" "$DEPLOY_PATH/infra/"*.sh

# 5. Creazione Archivio
echo "🗜️  Creating archive: $ARTIFACT_NAME..."
mkdir -p "$PROJECT_ROOT/artifact"
cd "$DEPLOY_PATH"
tar -czf "$PROJECT_ROOT/artifact/$ARTIFACT_NAME" .
cd "$PROJECT_ROOT"

rm -rf "$BUILD_TMP"
echo "------------------------------------------------------------"
echo "✅ Release v$VERSION pronta in deployments/$SERVICE_NAME"
echo "📦 Archivio disponibile in artifact/$ARTIFACT_NAME"
echo "💡 Per installare: copia la cartella sul server e lancia ./install.sh"
echo "------------------------------------------------------------"
