#!/bin/bash

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"

echo "🧹 Pulizia ambiente di release..."

# 1. Rimuove le directory temporanee di build
if [ -d "$PROJECT_ROOT/release" ]; then
    echo "🗑️  Rimovendo directory release/..."
    rm -rf "$PROJECT_ROOT/release"
fi

if [ -d "$PROJECT_ROOT/.build_tmp" ]; then
    echo "🗑️  Rimovendo directory .build_tmp/..."
    rm -rf "$PROJECT_ROOT/.build_tmp"
fi

if [ -d "$PROJECT_ROOT/artifact" ]; then
    echo "🗑️  Rimovendo directory artifact/..."
    rm -rf "$PROJECT_ROOT/artifact"
fi

# 2. Nota sui Deployments
echo "ℹ️  Nota: La cartella deployments/ NON viene toccata per preservare i servizi attivi."
echo "✅ Pulizia ambiente di build completata."
