#!/bin/bash

# ThreatIntel Installer Manager
# Unified CLI for deployment lifecycle management

# 1. Configuration & Paths
INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$INSTALLER_DIR/build"

# Colors for better UI
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper for headers
header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${YELLOW}  $1 ${NC}"
    echo -e "${BLUE}============================================================${NC}"
}

# 2. Action Functions
do_clean() {
    header "Cleaning Workspace"
    "$BUILD_DIR/clean-release.sh"
}

do_quick_release() {
    header "Creating Quick Release (Defaults)"
    "$BUILD_DIR/make-release.sh"
}

do_wizard_release() {
    # No header here as the script has its own
    "$BUILD_DIR/interactive-release.sh"
}

do_install() {
    header "Pending Deployments Installation"
    "$BUILD_DIR/deploy-pending.sh"
}

do_uninstall() {
    header "Release Uninstallation"
    "$BUILD_DIR/uninstall-release.sh"
}

# 3. Main Menu Loop
show_menu() {
    clear
    echo -e "${GREEN}"
    echo "  ╔════════════════════════════════════════════════════╗"
    echo "  ║         THREAT INTEL - INSTALLER MANAGER           ║"
    echo "  ╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "  ${BLUE}BUILD & RELEASE${NC}"
    echo "  1) Quick Release      - Create release with defaults"
    echo "  2) Release Wizard     - Guided configuration and build"
    echo "  3) Clean Workspace    - Remove temporary build files"
    echo ""
    echo -e "  ${BLUE}DEPLOYMENT MANAGEMENT${NC}"
    echo "  4) Install Pending    - Search and install new releases"
    echo "  5) Uninstall Service  - Remove an active release (Nginx+Systemd)"
    echo ""
    echo "  q) Quit"
    echo ""
    read -p "  Selection: " choice

    case $choice in
        1) do_quick_release ;;
        2) do_wizard_release ;;
        3) do_clean ;;
        4) do_install ;;
        5) do_uninstall ;;
        q|Q) echo -e "\n  Goodbye!\n"; exit 0 ;;
        *) echo -e "\n  ${RED}Invalid option${NC}"; sleep 1 ;;
    esac

    echo -e "\n${YELLOW}Press ENTER to return to menu...${NC}"
    read
    show_menu
}

# Ensure build scripts are executable
chmod +x "$BUILD_DIR"/*.sh

# Start the manager
show_menu
