#!/bin/bash

# Configuration
PROJECT_ROOT=$(pwd)
RELEASE_DIR="$PROJECT_ROOT/release"
BUILD_TMP="$PROJECT_ROOT/.build_tmp"
ARTIFACT_NAME="threatintel-bundle-$(date +%Y%m%d).tar.gz"

echo "🚀 Starting Hybrid Bundle Build (NCC)..."

# 1. Cleanup
rm -rf "$RELEASE_DIR" "$BUILD_TMP"
mkdir -p "$RELEASE_DIR"

# 2. Build Single-File Bundle
echo "🏗️  Bundling with @vercel/ncc..."
npx -y @vercel/ncc build server.ts -o "$BUILD_TMP"
if [ $? -ne 0 ]; then
    echo "❌ Bundling failed."
    exit 1
fi

# 3. Assemble Release Artifact
echo "📦 Assembling artifacts..."

# A. The Bundle
cp "$BUILD_TMP/index.js" "$RELEASE_DIR/"

# B. GeoIP Data (Essential Assets)
echo "🌍 Copying GeoIP databases..."
mkdir -p "$RELEASE_DIR/data"
cp node_modules/geoip-lite/data/*.dat "$RELEASE_DIR/data/"

# C. Infrastructure Scripts (Linearized)
echo "🔧 Adding infra scripts..."
mkdir -p "$RELEASE_DIR/infra"
cp redis/check-redis.sh "$RELEASE_DIR/infra/" 2>/dev/null || true
cp mongodb/check-mongodb.sh "$RELEASE_DIR/infra/" 2>/dev/null || true

# D. Environment & Setup
cp .env.example "$RELEASE_DIR/" 2>/dev/null || true
cp scripts/deploy/install.sh "$RELEASE_DIR/" 2>/dev/null || true
cp scripts/deploy/threatintel.service.template "$RELEASE_DIR/threatintel.service" 2>/dev/null || true

# 4. Final Archive
echo "🗜️  Creating archive: $ARTIFACT_NAME..."
cd "$RELEASE_DIR"
tar -czf "../$ARTIFACT_NAME" .
cd "$PROJECT_ROOT"

# Cleanup
rm -rf "$BUILD_TMP"

echo "✅ Success! Artifact ready: $ARTIFACT_NAME"
echo "📂 Contents of release folder:"
ls -F "$RELEASE_DIR"
