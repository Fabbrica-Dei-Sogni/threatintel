#!/bin/bash

# Managed-By: threatintel-release-workflow
# Installer-Scoped Health Check for Qdrant

QDRANT_HOST="127.0.0.1"
PORT=${QDRANT_PORT:-6333}
NAME=${SERVICE_NAME:-threatintel}
MAX_WAIT=30
WAIT_TIME=0

# Recupera il path assoluto dello script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Nella release, docker-compose.infra.yml è nella cartella superiore rispetto a infra/
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 [Installer] Verifica disponibilità Qdrant su porta $PORT..."

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  if timeout 1 bash -c "echo > /dev/tcp/$QDRANT_HOST/$PORT" 2>/dev/null; then
    echo "✅ Qdrant disponibile su $QDRANT_HOST:$PORT"
    exit 0
  fi
  
  echo "⏳ Attendo Qdrant... ($WAIT_TIME/$MAX_WAIT)"
  sleep 2
  WAIT_TIME=$((WAIT_TIME + 2))
done

echo "❌ Qdrant non disponibile dopo $MAX_WAIT secondi"

if [ -f "$COMPOSE_DIR/docker-compose.infra.yml" ]; then
    echo "🚀 [Installer] Tentativo avvio automatico Qdrant per $NAME..."
    cd "$COMPOSE_DIR" && docker compose -p "$NAME" -f docker-compose.infra.yml up -d "qdrant-$NAME"
    
    sleep 5
    if timeout 1 bash -c "echo > /dev/tcp/$QDRANT_HOST/$PORT" 2>/dev/null; then
      echo "✅ Qdrant avviato correttamente"
      exit 0
    else
      echo "❌ Impossibile avviare Qdrant"
      exit 1
    fi
else
    echo "❌ Errore: docker-compose.infra.yml non trovato in $COMPOSE_DIR"
    exit 1
fi
