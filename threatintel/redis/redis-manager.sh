#!/bin/bash
# redis-manager.sh - Gestione Redis containerizzato

COMPOSE_DIR="$(pwd)"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"

cd "$COMPOSE_DIR" || exit 1

case "$1" in
  start)
    echo "🚀 Avvio Redis per honeypot..."
    docker compose up -d redis-ratelimit
    sleep 5
    if docker compose ps redis-ratelimit | grep -q "Up"; then
      echo "✅ Redis avviato correttamente"
      #echo "📊 Status: $(docker compose exec redis-ratelimit redis-cli -a $REDIS_PASSWORD ping 2>/dev/null)"
    else
      echo "❌ Errore avvio Redis"
      exit 1
    fi
    ;;
    
  stop)
    echo "⏹️ Arresto Redis..."
    docker compose stop redis-ratelimit
    echo "✅ Redis arrestato"
    ;;
    
  restart)
    echo "🔄 Riavvio Redis..."
    docker compose restart redis-ratelimit
    sleep 3
    echo "✅ Redis riavviato"
    ;;
    
  status)
    echo "📊 Status Redis:"
    docker compose ps redis-ratelimit
    if docker compose ps redis-ratelimit | grep -q "Up"; then
      echo ""
      echo "📈 Statistiche memoria:"
      docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" info memory | grep used_memory_human
      echo ""
      echo "🔑 Chiavi rate limiting attive:"
      docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" info keyspace
    fi
    ;;
    
  logs)
    echo "📋 Log Redis (ultimi 100 righe):"
    docker compose logs --tail=100 redis-ratelimit
    ;;
    
  connect)
    echo "🔌 Connessione Redis CLI:"
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD"
    ;;
    
  backup)
    BACKUP_DIR="/opt/honeypot/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/redis-ratelimit-$(date +%Y%m%d-%H%M%S).rdb"
    
    echo "💾 Backup Redis in corso..."
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" BGSAVE
    sleep 2
    docker cp "$(docker compose ps -q redis-ratelimit)":/data/dump.rdb "$BACKUP_FILE"
    echo "✅ Backup completato: $BACKUP_FILE"
    ;;
    
  clear-rate-limits)
    echo "🧹 Pulizia rate limits..."
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" --scan --pattern "ddos:*" | \
      xargs -I{} docker compose exec -T redis-ratelimit redis-cli -a "$REDIS_PASSWORD" del {}
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" --scan --pattern "critical:*" | \
      xargs -I{} docker compose exec -T redis-ratelimit redis-cli -a "$REDIS_PASSWORD" del {}
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" --scan --pattern "trap:*" | \
      xargs -I{} docker compose exec -T redis-ratelimit redis-cli -a "$REDIS_PASSWORD" del {}
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" --scan --pattern "app:*" | \
      xargs -I{} docker compose exec -T redis-ratelimit redis-cli -a "$REDIS_PASSWORD" del {}
    echo "✅ Rate limits puliti"
    ;;
    
  clear-blacklist)
    echo "🧹 Pulizia blacklist..."
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" del blacklisted-ips
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" --scan --pattern "blacklist:*" | \
      xargs -I{} docker compose exec -T redis-ratelimit redis-cli -a "$REDIS_PASSWORD" del {}
    docker compose exec redis-ratelimit redis-cli -a "$REDIS_PASSWORD" --scan --pattern "violations:*" | \
      xargs -I{} docker compose exec -T redis-ratelimit redis-cli -a "$REDIS_PASSWORD" del {}
    echo "✅ Blacklist pulita"
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|connect|backup|clear-rate-limits|clear-blacklist}"
    echo ""
    echo "Comandi disponibili:"
    echo "  start              - Avvia Redis"
    echo "  stop               - Arresta Redis"  
    echo "  restart            - Riavvia Redis"
    echo "  status             - Mostra status e statistiche"
    echo "  logs               - Mostra log"
    echo "  connect            - Connetti a Redis CLI"
    echo "  backup             - Backup database Redis"
    echo "  clear-rate-limits  - Pulisce tutti i rate limits"
    echo "  clear-blacklist    - Pulisce blacklist IP"
    exit 1
    ;;
esac
