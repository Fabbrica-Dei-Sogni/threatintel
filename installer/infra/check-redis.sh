#!/bin/bash

# Managed-By: threatintel-release-workflow
# Installer-Scoped Health Check for Redis

REDIS_HOST="127.0.0.1"
PORT=${REDIS_PORT:-6379}
NAME=${SERVICE_NAME:-threatintel}
MAX_WAIT=30
WAIT_TIME=0

# Recupera il path assoluto dello script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Nella release, docker-compose.infra.yml è nella cartella superiore rispetto a infra/
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 [Installer] Verifica disponibilità Redis su porta $PORT..."

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  if timeout 1 bash -c "echo > /dev/tcp/$REDIS_HOST/$PORT" 2>/dev/null; then
    echo "✅ Redis disponibile su $REDIS_HOST:$PORT"
    exit 0
  fi
  
  echo "⏳ Attendo Redis... ($WAIT_TIME/$MAX_WAIT)"
  sleep 2
  WAIT_TIME=$((WAIT_TIME + 2))
done

echo "❌ Redis non disponibile dopo $MAX_WAIT secondi"

if [ -f "$COMPOSE_DIR/docker-compose.infra.yml" ]; then
    echo "🚀 [Installer] Tentativo avvio automatico Redis per $NAME..."
    cd "$COMPOSE_DIR" && docker compose -p "$NAME" -f docker-compose.infra.yml up -d "redis-$NAME"
    
    sleep 5
    if timeout 1 bash -c "echo > /dev/tcp/$REDIS_HOST/$PORT" 2>/dev/null; then
      echo "✅ Redis avviato correttamente"
      exit 0
    else
      echo "❌ Impossibile avviare Redis"
      exit 1
    fi
else
    echo "❌ Errore: docker-compose.infra.yml non trovato in $COMPOSE_DIR"
    exit 1
fi
