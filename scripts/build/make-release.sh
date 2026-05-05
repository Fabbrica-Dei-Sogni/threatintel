#!/bin/bash

# Configuration
# Robustly find the project root regardless of where the script is called from
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
RELEASE_DIR="$PROJECT_ROOT/release"
BUILD_TMP="$PROJECT_ROOT/.build_tmp"
VERSION=${1:-"0.0.1"}
ARTIFACT_NAME="threatintel-bundle-v$VERSION-$(date +%Y%m%d).tar.gz"

echo "🚀 Starting Hybrid Bundle Build (NCC) - Version: $VERSION"
echo "📍 Project Root: $PROJECT_ROOT"

# 1. Cleanup
rm -rf "$RELEASE_DIR" "$BUILD_TMP"
mkdir -p "$RELEASE_DIR"

# 2. Build Single-File Bundle
echo "🏗️  Bundling with @vercel/ncc..."
npx -y @vercel/ncc build "$PROJECT_ROOT/server.ts" -o "$BUILD_TMP"
if [ $? -ne 0 ]; then
    echo "❌ Bundling failed."
    exit 1
fi

# 3. Assemble Release Artifact
echo "📦 Assembling artifacts..."

# A. The Bundle
cp "$BUILD_TMP/index.js" "$RELEASE_DIR/"
echo "$VERSION" > "$RELEASE_DIR/VERSION"

# B. GeoIP Data (Essential Assets)
echo "🌍 Copying GeoIP databases..."
mkdir -p "$RELEASE_DIR/data"
cp "$PROJECT_ROOT"/node_modules/geoip-lite/data/*.dat "$RELEASE_DIR/data/"

# C. Infrastructure Scripts (Linearized)
echo "🔧 Adding infra scripts..."
mkdir -p "$RELEASE_DIR/infra"
cp "$PROJECT_ROOT/redis/check-redis.sh" "$RELEASE_DIR/infra/" 2>/dev/null || true
cp "$PROJECT_ROOT/mongodb/check-mongodb.sh" "$RELEASE_DIR/infra/" 2>/dev/null || true

# D. Environment & Setup
cp "$PROJECT_ROOT/.env.example" "$RELEASE_DIR/" 2>/dev/null || true
cp "$PROJECT_ROOT/scripts/deploy/install.sh" "$RELEASE_DIR/" 2>/dev/null || true
cp "$PROJECT_ROOT/scripts/deploy/uninstall.sh" "$RELEASE_DIR/" 2>/dev/null || true
chmod +x "$RELEASE_DIR/install.sh" "$RELEASE_DIR/uninstall.sh"
cp "$PROJECT_ROOT/scripts/deploy/threatintel.service.template" "$RELEASE_DIR/threatintel.service.template" 2>/dev/null || true

# E. Proxy Configurations (Modular Nginx Templates)
echo "🌐 Adding proxy templates..."
mkdir -p "$RELEASE_DIR/proxy"
cp "$PROJECT_ROOT/scripts/deploy/nginx_globals.conf.template" "$RELEASE_DIR/proxy/nginx_globals.template"
cp "$PROJECT_ROOT/scripts/deploy/nginx_vhost.conf.template" "$RELEASE_DIR/proxy/nginx_vhost.template"

# 4. Final Archive
echo "🗜️  Creating archive: $ARTIFACT_NAME..."
mkdir -p "$PROJECT_ROOT/artifact"
cd "$RELEASE_DIR"
tar -czf "$PROJECT_ROOT/artifact/$ARTIFACT_NAME" .
cd "$PROJECT_ROOT"

# Cleanup
rm -rf "$BUILD_TMP"

echo "✅ Success! Artifact ready: $ARTIFACT_NAME"
echo "📂 Contents of release folder:"
ls -F "$RELEASE_DIR"
