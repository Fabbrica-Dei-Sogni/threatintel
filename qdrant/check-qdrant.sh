#!/bin/bash

# Managed-By: threatintel-release-workflow

QDRANT_HOST="127.0.0.1"
QDRANT_PORT="6333"
MAX_WAIT=30
WAIT_TIME=0

# Recupera il path assoluto dello script per trovare il docker-compose
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Verifica disponibilità Qdrant (RAG)..."

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  if timeout 1 bash -c "echo > /dev/tcp/$QDRANT_HOST/$QDRANT_PORT" 2>/dev/null; then
    echo "✅ Qdrant disponibile su $QDRANT_HOST:$QDRANT_PORT"
    exit 0
  fi
  
  echo "⏳ Attendo Qdrant... ($WAIT_TIME/$MAX_WAIT)"
  sleep 2
  WAIT_TIME=$((WAIT_TIME + 2))
done

echo "❌ Qdrant non disponibile dopo $MAX_WAIT secondi"
echo "🚀 Tentativo avvio automatico Qdrant..."

if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    cd "$SCRIPT_DIR" && docker-compose up -d qdrant-threatintel
    
    sleep 5

    if timeout 1 bash -c "echo > /dev/tcp/$QDRANT_HOST/$QDRANT_PORT" 2>/dev/null; then
      echo "✅ Qdrant avviato correttamente"
      exit 0
    else
      echo "❌ Impossibile avviare Qdrant"
      exit 1
    fi
else
    echo "❌ Errore: docker-compose.yml non trovato in $SCRIPT_DIR"
    exit 1
fi
