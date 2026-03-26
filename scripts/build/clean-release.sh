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

# 2. Rimuove le directory di test deploy locali
if [ -d "$PROJECT_ROOT/.test_deploy" ]; then
    echo "🗑️  Rimovendo directory di test .test_deploy/..."
    rm -rf "$PROJECT_ROOT/.test_deploy"
fi

echo "✅ Pulizia completata. (La cartella artifact/ è stata preservata)"
