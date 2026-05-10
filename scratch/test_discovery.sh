#!/bin/bash
VALID_MANAGED=$(grep -l "Managed-By: threatintel-release-workflow" /etc/systemd/system/*.service 2>/dev/null | xargs -r -n1 basename | sed 's/\.service$//')
WORKSPACE_PATH="/home/amodica/workspaces/threatintel"
BROKEN_MANAGED=$(find /etc/systemd/system/ -maxdepth 1 -xtype l 2>/dev/null | xargs -r -I{} ls -l {} | grep "$WORKSPACE_PATH" | awk '{print $9}' | xargs -r -n1 basename | sed 's/\.service$//')
MANAGED_SERVICES=$(echo -e "$VALID_MANAGED\n$BROKEN_MANAGED" | grep -v '^$' | sort -u)
echo "Managed Services Found:"
echo "$MANAGED_SERVICES"
