#!/bin/bash

# ThreatIntel - Generic Release Builder
# Questo script viene eseguito dallo SVILUPPATORE per creare il pacchetto di distribuzione.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
INSTALLER_DIR="$PROJECT_ROOT/installer"
BUILD_TMP="$PROJECT_ROOT/.build_tmp"

# Parametri base
PACKAGE_VERSION=$(grep '"version":' "$PROJECT_ROOT/package.json" | head -n 1 | cut -d'"' -f4)
VERSION=${1:-$PACKAGE_VERSION}
SERVICE_NAME=${2:-"threatintel-release"}
DEPLOY_PATH="$PROJECT_ROOT/deployments/$SERVICE_NAME"
ARTIFACT_NAME="threatintel-bundle-$SERVICE_NAME-v$VERSION.tar.gz"

echo "🚀 Building Release v$VERSION for $SERVICE_NAME..."

# 1. Cleanup & Setup
rm -rf "$DEPLOY_PATH" "$BUILD_TMP"
mkdir -p "$DEPLOY_PATH/data" "$DEPLOY_PATH/infra" "$DEPLOY_PATH/proxy" "$DEPLOY_PATH/mongo-init" "$DEPLOY_PATH/cowrie/etc"
mkdir -p "$BUILD_TMP"

# 2. Compilazione
echo "📚 Generating Swagger spec..."
npm run swagger:gen

echo "🏗️  Bundling code with ncc..."
npx -y @vercel/ncc build "$PROJECT_ROOT/server.ts" -o "$BUILD_TMP"
if [ $? -ne 0 ]; then
    echo "❌ Errore durante la compilazione con ncc."
    exit 1
fi

cp "$BUILD_TMP/index.js" "$DEPLOY_PATH/"
echo "$VERSION" > "$DEPLOY_PATH/VERSION"

# 3. Copia Asset statici (GeoIP & Swagger)
echo "🌍 Adding GeoIP data..."
cp "$PROJECT_ROOT"/node_modules/geoip-lite/data/*.dat "$DEPLOY_PATH/data/" 2>/dev/null

echo "📚 Adding Swagger UI assets for ncc bundle..."
mkdir -p "$DEPLOY_PATH/public/swagger"
cp -r "$PROJECT_ROOT/node_modules/swagger-ui-dist/"* "$DEPLOY_PATH/public/swagger/"
# Copia il file spec appena generato
cp "$PROJECT_ROOT/public/swagger/swagger-spec.json" "$DEPLOY_PATH/public/swagger/"

# 4. Copia Script e Template (Agnostici)
echo "📦 Adding templates and installer..."
cp "$INSTALLER_DIR/deploy/install.sh" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/uninstall.sh" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/docker-compose.infra.yml.template" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/env.template" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/threatintel.service.template" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/nginx_vhost.conf.template" "$DEPLOY_PATH/proxy/"
cp "$INSTALLER_DIR/deploy/nginx_locations.conf.template" "$DEPLOY_PATH/proxy/"
cp "$INSTALLER_DIR/deploy/nginx_globals.conf.template" "$DEPLOY_PATH/proxy/"

# Script infra
cp "$INSTALLER_DIR/infra/check-redis.sh" "$DEPLOY_PATH/infra/"
cp "$INSTALLER_DIR/infra/check-mongodb.sh" "$DEPLOY_PATH/infra/"
cp "$INSTALLER_DIR/infra/check-qdrant.sh" "$DEPLOY_PATH/infra/"
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
