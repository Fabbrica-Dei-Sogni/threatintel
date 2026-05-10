#!/bin/bash

# Managed-By: threatintel-release-workflow

# Orchestratore Globale per la disinstallazione delle release.
# Delega l'operazione atomica allo script uninstall.sh di ciascuna release.

echo "🗑️  ThreatIntel Global Release Uninstaller"
echo "------------------------------------------"

# 1. Scoperta dei servizi gestiti
# Cerchiamo i servizi che hanno il tag di gestione (validi)
VALID_MANAGED=$(grep -l "Managed-By: threatintel-release-workflow" /etc/systemd/system/*.service 2>/dev/null | xargs -r -n1 basename | sed 's/\.service$//')

# Cerchiamo link rotti che puntano al workspace (residui di cancellazioni manuali)
WORKSPACE_PATH="/home/amodica/workspaces/threatintel"
BROKEN_MANAGED=$(find /etc/systemd/system/ -maxdepth 1 -xtype l 2>/dev/null | xargs -r -I{} ls -l {} | grep "$WORKSPACE_PATH" | awk '{print $9}' | xargs -r -n1 basename | sed 's/\.service$//')

MANAGED_SERVICES=$(echo -e "$VALID_MANAGED\n$BROKEN_MANAGED" | grep -v '^$' | sort -u)

if [ -z "$MANAGED_SERVICES" ]; then
    echo "ℹ️  Nessun servizio gestito o residuo trovato nel sistema."
    exit 0
fi

if [ -n "$1" ]; then
    SERVICE_TO_REMOVE="$1"
else
    echo "Seleziona il servizio da rimuovere:"
    select SERVICE in $MANAGED_SERVICES "Annulla (Torna al Menu)"; do
        if [ "$SERVICE" == "Annulla (Torna al Menu)" ]; then
            echo "🔙 Ritorno al menu principale..."
            exit 0
        elif [ -n "$SERVICE" ]; then
            SERVICE_TO_REMOVE="$SERVICE"
            break
        fi
    done
fi

if [ -z "$SERVICE_TO_REMOVE" ]; then exit 0; fi

# 2. Recupero del path della release tramite systemd
# Leggiamo la WorkingDirectory dal file di servizio per sapere dove sta lo script uninstall.sh
SERVICE_FILE="/etc/systemd/system/$SERVICE_TO_REMOVE.service"
if [ ! -e "$SERVICE_FILE" ] && [ ! -L "$SERVICE_FILE" ]; then
    echo "❌ Errore: File di servizio $SERVICE_FILE non trovato."
    exit 1
fi

# Recupero del path della release (se possibile)
RELEASE_PATH=$(grep "WorkingDirectory=" "$SERVICE_FILE" 2>/dev/null | cut -d'=' -f2)

echo "🔍 Release trovata in: $RELEASE_PATH"

if [ -d "$RELEASE_PATH" ] && [ -f "$RELEASE_PATH/uninstall.sh" ]; then
    echo "🚀 Delegando la rimozione a $RELEASE_PATH/uninstall.sh..."
    cd "$RELEASE_PATH"
    sudo ./uninstall.sh "$SERVICE_TO_REMOVE"
else
    echo "⚠️  Attenzione: Script di disinstallazione atomico non trovato in $RELEASE_PATH."
    echo "🧹 Procedo con rimozione manuale di emergenza (systemd + nginx)..."
    
    # 1. Systemd Cleanup
    sudo systemctl stop "$SERVICE_TO_REMOVE" 2>/dev/null
    sudo systemctl disable "$SERVICE_TO_REMOVE" 2>/dev/null
    sudo rm -f "$SERVICE_FILE"
    sudo systemctl daemon-reload
    echo "✅ Servizio systemd rimosso."

    # 2. Nginx Cleanup
    echo "🧹 Pulizia configurazioni Nginx per $SERVICE_TO_REMOVE..."
    NGINX_VHOST_ENABLED="/etc/nginx/sites-enabled/$SERVICE_TO_REMOVE.conf"
    NGINX_VHOST_AVAILABLE="/etc/nginx/sites-available/$SERVICE_TO_REMOVE.conf"
    NGINX_GLOBALS="/etc/nginx/conf.d/threatintel_globals_$SERVICE_TO_REMOVE.conf"
    
    RELOAD_NGINX=false
    for f in "$NGINX_VHOST_ENABLED" "$NGINX_VHOST_AVAILABLE" "$NGINX_GLOBALS"; do
        if [ -L "$f" ] || [ -f "$f" ]; then
            sudo rm -f "$f"
            echo "🗑️  Rimosso (emergenza): $f"
            RELOAD_NGINX=true
        fi
    done

    if [ "$RELOAD_NGINX" = true ]; then
        if sudo nginx -t 2>/dev/null; then
            sudo systemctl reload nginx
            echo "✅ Nginx ricaricato correttamente."
        else
            echo "⚠️  Nginx ha errori di configurazione. Controlla manualmente con 'sudo nginx -t'."
        fi
    fi
    echo "✅ Rimozione di emergenza completata."
fi

echo "✨ Operazione conclusa."
