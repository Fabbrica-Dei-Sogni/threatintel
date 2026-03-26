#!/bin/bash

# Managed-By: threatintel-release-workflow

echo "🗑️  ThreatIntel Release Uninstaller"
echo "----------------------------------"

# 1. Scoperta dei servizi gestiti
MANAGED_SERVICES=$(grep -l "Managed-By: threatintel-release-workflow" /etc/systemd/system/*.service 2>/dev/null | xargs -n1 basename)

if [ -z "$MANAGED_SERVICES" ]; then
    echo "ℹ️  Nessun servizio gestito trovato nel sistema."
    exit 0
fi

if [ -n "$1" ]; then
    # Se passato come argomento, usalo direttamente
    SERVICE_TO_REMOVE="$1"
    # Verifica che sia effettivamente gestito da noi
    if ! echo "$MANAGED_SERVICES" | grep -q "^$SERVICE_TO_REMOVE$"; then
        echo "⚠️  Attenzione: Il servizio '$SERVICE_TO_REMOVE' non sembra essere gestito da questo workflow."
        read -p "Vuoi procedere comunque? [y/N]: " PROCEED
        if [[ ! "$PROCEED" =~ ^([yY][eE][sS]|[yY])$ ]]; then exit 1; fi
    fi
else
    # Altrimenti mostra lista interattiva
    echo "Servizi trovati:"
    select SERVICE in $MANAGED_SERVICES; do
        if [ -n "$SERVICE" ]; then
            SERVICE_TO_REMOVE="$SERVICE"
            break
        fi
    done
fi

if [ -z "$SERVICE_TO_REMOVE" ]; then exit 0; fi

# 2. Rimozione
echo "🧹 Rimuovendo $SERVICE_TO_REMOVE..."

sudo systemctl stop "$SERVICE_TO_REMOVE" 2>/dev/null
sudo systemctl disable "$SERVICE_TO_REMOVE" 2>/dev/null
sudo rm "/etc/systemd/system/$SERVICE_TO_REMOVE"
sudo systemctl daemon-reload

echo "✅ Servizio $SERVICE_TO_REMOVE rimosso correttamente."
