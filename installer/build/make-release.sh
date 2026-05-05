#!/bin/bash

# Configuration
# Robustly find the project root regardless of where the script is called from
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
INSTALLER_DIR="$PROJECT_ROOT/installer"
BUILD_TMP="$PROJECT_ROOT/.build_tmp"

# --- Parameters & Defaults ---
# Get version from package.json
PKG_VERSION=$(grep '"version":' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
VERSION=${1:-${PKG_VERSION:-"0.0.1"}}

SERVICE_NAME=${2:-"threatintel-release"}
DEPLOY_PORT=${3:-"3999"}
DEPLOY_USER=${4:-$(whoami)}
DEPLOY_ENV=${5:-"production"}
DEPLOY_DESC=${6:-"Threat Intelligence Logger (Release Bundle)"}
ALLOWED_ORIGINS=${7:-"http://localhost:5173,http://localhost:4300,https://localhost,http://192.168.0.1:5173,http://192.168.0.1:4300"}
APP_DOMAIN=${8:-"localhost"}
API_BASE_URL=${9:-"http://localhost/honeypot/api"}

# Paths
DEPLOY_PATH="$PROJECT_ROOT/deployments/$SERVICE_NAME"
ARTIFACT_NAME="threatintel-bundle-$SERVICE_NAME-v$VERSION.tar.gz"

echo "🚀 Starting Autonomous Build - Version: $VERSION"
echo "📛 Service Name: $SERVICE_NAME"
echo "📍 Destination: $DEPLOY_PATH"

# 1. Cleanup
echo "🧹 Cleaning up old build data..."
rm -rf "$DEPLOY_PATH" "$BUILD_TMP"
mkdir -p "$DEPLOY_PATH" "$BUILD_TMP"

# 2. Build Single-File Bundle
echo "🏗️  Bundling with @vercel/ncc..."
npx -y @vercel/ncc build "$PROJECT_ROOT/server.ts" -o "$BUILD_TMP"
if [ $? -ne 0 ]; then
    echo "❌ Bundling failed."
    exit 1
fi

# 3. Assemble Release Artifact in deployments/
echo "📦 Assembling artifacts in $DEPLOY_PATH..."

# A. The Bundle & Version
cp "$BUILD_TMP/index.js" "$DEPLOY_PATH/"
echo "$VERSION" > "$DEPLOY_PATH/VERSION"

# B. GeoIP Data
echo "🌍 Copying GeoIP databases..."
mkdir -p "$DEPLOY_PATH/data"
cp "$PROJECT_ROOT"/node_modules/geoip-lite/data/*.dat "$DEPLOY_PATH/data/" 2>/dev/null || echo "⚠️  GeoIP data not found, skipping."

# C. Infrastructure Scripts
echo "🔧 Adding infra scripts..."
mkdir -p "$DEPLOY_PATH/infra"
cp "$PROJECT_ROOT/redis/check-redis.sh" "$DEPLOY_PATH/infra/" 2>/dev/null || true
cp "$PROJECT_ROOT/mongodb/check-mongodb.sh" "$DEPLOY_PATH/infra/" 2>/dev/null || true

# D. Environment & Setup
cp "$INSTALLER_DIR/deploy/install.sh" "$DEPLOY_PATH/"
cp "$INSTALLER_DIR/deploy/uninstall.sh" "$DEPLOY_PATH/"
chmod +x "$DEPLOY_PATH/install.sh" "$DEPLOY_PATH/uninstall.sh"

# E. Templates & Parameter Substitution (The "Sed" Phase)
echo "⚙️  Resolving templates with provided parameters..."

# Resolve Systemd Service
NODE_PATH=$(which node)
NODE_BIN_DIR=$(dirname "$NODE_PATH")
SERVICE_TEMPLATE="$INSTALLER_DIR/deploy/threatintel.service.template"

if [ -f "$SERVICE_TEMPLATE" ]; then
    sed -e "s|{{WORKING_DIR}}|$DEPLOY_PATH|g" \
        -e "s|{{USER}}|$DEPLOY_USER|g" \
        -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
        -e "s|{{PORT}}|$DEPLOY_PORT|g" \
        -e "s|{{NODE_ENV}}|$DEPLOY_ENV|g" \
        -e "s|{{DESCRIPTION}}|$DEPLOY_DESC|g" \
        -e "s|{{VERSION}}|$VERSION|g" \
        -e "s|{{ALLOWED_ORIGINS}}|$ALLOWED_ORIGINS|g" \
        -e "s|{{APP_DOMAIN}}|$APP_DOMAIN|g" \
        -e "s|{{API_BASE_URL}}|$API_BASE_URL|g" \
        -e "s|{{NODE_PATH}}|$NODE_PATH|g" \
        -e "s|{{NODE_BIN_DIR}}|$NODE_BIN_DIR|g" \
        "$SERVICE_TEMPLATE" > "$DEPLOY_PATH/$SERVICE_NAME.service"
    echo "✅ Created: $SERVICE_NAME.service"
fi

# Resolve Nginx Configurations
mkdir -p "$DEPLOY_PATH/proxy"
NGINX_GLOBALS_TMP="$INSTALLER_DIR/deploy/nginx_globals.conf.template"
NGINX_VHOST_TMP="$INSTALLER_DIR/deploy/nginx_vhost.conf.template"

if [ -f "$NGINX_GLOBALS_TMP" ]; then
    sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" "$NGINX_GLOBALS_TMP" > "$DEPLOY_PATH/proxy/threatintel_globals_$SERVICE_NAME.conf"
    echo "✅ Created: proxy/threatintel_globals_$SERVICE_NAME.conf"
fi

if [ -f "$NGINX_VHOST_TMP" ]; then
    sed -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
        -e "s|{{PORT}}|$DEPLOY_PORT|g" \
        "$NGINX_VHOST_TMP" > "$DEPLOY_PATH/proxy/$SERVICE_NAME.conf"
    echo "✅ Created: proxy/$SERVICE_NAME.conf"
fi

# 4. Final Archive
echo "🗜️  Creating archive: $ARTIFACT_NAME..."
mkdir -p "$PROJECT_ROOT/artifact"
cd "$DEPLOY_PATH"
tar -czf "$PROJECT_ROOT/artifact/$ARTIFACT_NAME" .
cd "$PROJECT_ROOT"

# Cleanup temp build files
rm -rf "$BUILD_TMP"

echo "------------------------------------------------------------"
echo "✅ Success! Deployment ready in: deployments/$SERVICE_NAME"
echo "📦 Archive created in: artifact/$ARTIFACT_NAME"
echo "------------------------------------------------------------"
ls -F "$DEPLOY_PATH"
