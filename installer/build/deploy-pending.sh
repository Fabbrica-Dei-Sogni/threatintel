#!/bin/bash

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"

echo "🔍 [Deploy Pending] Analisi cartelle deployments/..."
echo "------------------------------------------------------------"

# 1. Scansione directory in deployments/
if [ ! -d "$PROJECT_ROOT/deployments" ]; then
    echo "ℹ️  Nessun deployment trovato."
    exit 0
fi

PENDING_DEPLOYS=""
cd "$PROJECT_ROOT/deployments"
for dir in */; do
    # Verifica che la directory esista davvero e non sia il glob vuoto "*"
    [ -d "$dir" ] || continue

    dir=${dir%/} # Rimuove lo slash finale
    if [ ! -f "/etc/systemd/system/$dir.service" ]; then
        PENDING_DEPLOYS="$PENDING_DEPLOYS $dir"
    fi
done

if [ -z "$PENDING_DEPLOYS" ]; then
    echo "✅ Tutti i deployment rilevati sono già registrati come servizi systemd."
    exit 0
fi

echo "Deployments trovati ma NON ancora installati come servizi:"
select DEPLOY in $PENDING_DEPLOYS "Annulla (Torna al Menu)"; do
    if [ "$DEPLOY" == "Annulla (Torna al Menu)" ]; then
        echo "🔙 Ritorno al menu principale..."
        exit 0
    elif [ -n "$DEPLOY" ]; then
        SELECTED_DIR="$DEPLOY"
        break
    fi
done

if [ -z "$SELECTED_DIR" ]; then exit 0; fi

# 2. Avvio Installazione
cd "$PROJECT_ROOT/deployments/$SELECTED_DIR"

if [ ! -f "./install.sh" ]; then
    echo "❌ Errore: install.sh non trovato in deployments/$SELECTED_DIR"
    exit 1
fi

# Chiede conferma parametri minimi o usa i default nell'install.sh
./install.sh "$SELECTED_DIR"

if [ $? -eq 0 ]; then
    echo "✨ Deployment completato!"
else
    echo "❌ Errore durante l'installazione di $SELECTED_DIR."
    exit 1
fi
