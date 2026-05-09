#!/bin/sh

# 1. Pulizia e validazione BASE_PATH (deve finire con /)
case "$VITE_APP_BASE_PATH" in
    */) ;;
    *) VITE_APP_BASE_PATH="${VITE_APP_BASE_PATH}/" ;;
esac

# 2. Generazione configurazione JS a runtime
echo "🔧 Generazione configurazione JS..."
VARIABLES_JS='${VITE_APP_TITLE} ${VITE_APP_VERSION} ${VITE_WELCOME_PATH} ${VITE_API_TIMEOUT} ${VITE_HONEYPOT_NAME} ${VITE_HONEYPOT_LOCATION_LAT} ${VITE_HONEYPOT_LOCATION_LON} ${VITE_CHAINPROMPT_API_URL} ${VITE_APP_BASE_PATH} ${VITE_APP_API_URL} ${APP_ID}'
envsubst "$VARIABLES_JS" < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

echo "✅ Configurazione completata. Avvio Nginx..."
exec "$@"
