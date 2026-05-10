#!/bin/bash

# Managed-By: threatintel-release-workflow
# Installer-Scoped Health Check for MongoDB

NAME=${SERVICE_NAME:-threatintel}
CONTAINER_NAME="mongodb-$NAME"

echo "🔍 [Installer] Verifica container MongoDB: $CONTAINER_NAME"

docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" | grep "$CONTAINER_NAME" >/dev/null

if [ $? -eq 0 ]; then
  echo "✅ MongoDB container is running"
  exit 0
else
  echo "❌ MongoDB container is not running"
  exit 1
fi
