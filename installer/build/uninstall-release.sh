#!/bin/bash

# Managed-By: threatintel-release-workflow

# Orchestratore Globale per la disinstallazione delle release.
# Delega l'operazione atomica allo script uninstall.sh di ciascuna release.

echo "🗑️  ThreatIntel Global Release Uninstaller"
echo "------------------------------------------"

# 1. Scoperta dei servizi gestiti
# Cerchiamo i servizi che hanno il tag di gestione
MANAGED_SERVICES=$(grep -l "Managed-By: threatintel-release-workflow" /etc/systemd/system/*.service 2>/dev/null | xargs -r -n1 basename | sed 's/\.service$//' | sort -u)

if [ -z "$MANAGED_SERVICES" ]; then
    echo "ℹ️  Nessun servizio gestito trovato nel sistema."
    exit 0
fi

if [ -n "$1" ]; then
    SERVICE_TO_REMOVE="$1"
else
    echo "Seleziona il servizio da rimuovere:"
    select SERVICE in $MANAGED_SERVICES; do
        if [ -n "$SERVICE" ]; then
            SERVICE_TO_REMOVE="$SERVICE"
            break
        fi
    done
fi

if [ -z "$SERVICE_TO_REMOVE" ]; then exit 0; fi

# 2. Recupero del path della release tramite systemd
# Leggiamo la WorkingDirectory dal file di servizio per sapere dove sta lo script uninstall.sh
SERVICE_FILE="/etc/systemd/system/$SERVICE_TO_REMOVE.service"
if [ ! -f "$SERVICE_FILE" ]; then
    echo "❌ Errore: File di servizio $SERVICE_FILE non trovato."
    exit 1
fi

RELEASE_PATH=$(grep "WorkingDirectory=" "$SERVICE_FILE" | cut -d'=' -f2)

echo "🔍 Release trovata in: $RELEASE_PATH"

if [ -d "$RELEASE_PATH" ] && [ -f "$RELEASE_PATH/uninstall.sh" ]; then
    echo "🚀 Delegando la rimozione a $RELEASE_PATH/uninstall.sh..."
    cd "$RELEASE_PATH"
    sudo ./uninstall.sh "$SERVICE_TO_REMOVE"
else
    echo "⚠️  Attenzione: Script di disinstallazione atomico non trovato in $RELEASE_PATH."
    echo "🧹 Procedo con rimozione manuale di emergenza (solo systemd)..."
    sudo systemctl stop "$SERVICE_TO_REMOVE"
    sudo systemctl disable "$SERVICE_TO_REMOVE"
    sudo rm -f "$SERVICE_FILE"
    sudo systemctl daemon-reload
    echo "✅ Rimozione di emergenza completata."
fi

echo "✨ Operazione conclusa."
