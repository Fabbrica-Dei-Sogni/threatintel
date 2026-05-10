#!/bin/bash

# ThreatIntel Frontend - Installer Manager
# CLI Unificata per la gestione del ciclo di vita del frontend

# 1. Configurazione e Percorsi
INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$INSTALLER_DIR/build"
FRONTEND_ROOT="$(cd "$INSTALLER_DIR/../" && pwd)"

# Colori per la UI
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper per gli header
header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${YELLOW}  $1 ${NC}"
    echo -e "${BLUE}============================================================${NC}"
}

# 2. Funzioni d'azione
do_clean() {
    header "Pulizia Workspace"
    "$BUILD_DIR/clean-release.sh"
}

do_quick_release() {
    header "Creazione Release Rapida (Defaults)"
    "$BUILD_DIR/make-release.sh"
}

do_wizard_release() {
    # Non mettiamo header perché lo script ha il suo
    "$BUILD_DIR/interactive-release.sh"
}

do_test_install() {
    header "Avvio Test Installazione"
    DEPLOY_PATH="$FRONTEND_ROOT/deployments/threatintel-frontend"
    if [ -d "$DEPLOY_PATH" ]; then
        echo -e "🚀 Entro in $DEPLOY_PATH e avvio install.sh..."
        cd "$DEPLOY_PATH" && ./install.sh
    else
        echo -e "${RED}❌ Nessun deployment trovato. Crea prima una release (Opzione 1 o 2).${NC}"
    fi
}

# 3. Loop Menu Principale
show_menu() {
    clear
    echo -e "${GREEN}"
    echo "  ╔════════════════════════════════════════════════════╗"
    echo "  ║      THREAT INTEL - FRONTEND INSTALLER MANAGER     ║"
    echo "  ╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "  ${BLUE}BUILD & RELEASE${NC}"
    echo "  1) Quick Release      - Crea release con default"
    echo "  2) Release Wizard     - Configurazione guidata e build"
    echo "  3) Clean Workspace    - Rimuove artifact e file temporanei"
    echo ""
    echo -e "  ${BLUE}TESTING${NC}"
    echo "  4) Run Local Test     - Esegue install.sh nel deployment locale"
    echo ""
    echo "  q) Esci"
    echo ""
    read -p "  Selezione: " choice

    case $choice in
        1) do_quick_release ;;
        2) do_wizard_release ;;
        3) do_clean ;;
        4) do_test_install ;;
        q|Q) echo -e "\n  A presto!\n"; exit 0 ;;
        *) echo -e "\n  ${RED}Opzione non valida${NC}"; sleep 1 ;;
    esac

    echo -e "\n${YELLOW}Premi INVIO per tornare al menu...${NC}"
    read
    show_menu
}

# Assicurati che gli script siano eseguibili
chmod +x "$BUILD_DIR"/*.sh

# Avvia il manager
show_menu
