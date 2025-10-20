#!/bin/bash

echo "🚀 Setup Threat Intelligence System"

# Installa dipendenze Node.js
echo "📦 Installazione dipendenze..."
npm install

# Setup MongoDB (se non installato)
if ! command -v mongod &> /dev/null; then
    echo "📊 Installazione MongoDB..."
    sudo apt update
    sudo apt install -y mongodb
    sudo systemctl start mongodb
    sudo systemctl enable mongodb
fi

# Configurazione Nginx
echo "⚙️  Configurazione Nginx..."

# Crea il file di configurazione del sito
sudo cp threatintel.conf /etc/nginx/sites-available/threatintel

# Abilita il sito
sudo ln -sf /etc/nginx/sites-available/threatintel /etc/nginx/sites-enabled/

# Rimuovi configurazione default se presente
sudo rm -f /etc/nginx/sites-enabled/default

# Testa la configurazione
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configurazione Nginx valida"
    sudo systemctl reload nginx
    echo "🔄 Nginx ricaricato"
else
    echo "❌ Errore nella configurazione Nginx"
    exit 1
fi

# Crea servizio systemd per l'app Node.js
echo "🔧 Creazione servizio systemd..."

sudo tee /etc/systemd/system/threatintel.service > /dev/null <<EOF
[Unit]
Description=Threat Intelligence Logger
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
ExecStartPre=$(pwd)/redis/script/check-redis.sh
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3999
Environment=MONGO_URI=mongodb://intelagent:intelagent@127.0.0.1:17017/threatinteldb
Environment=REDIS_HOST=127.0.0.1
Environment=REDIS_PORT=6379
Environment=REDIS_PASSWORD=!!!HoneyPotRedis!!!
Environment=REDIS_DB=0

[Install]
WantedBy=multi-user.target
EOF

# Fornisci i permessi a www-data alla working directory
sudo chown -R www-data:www-data $(pwd)
sudo chmod -R 755 $(pwd)

# Abilita e avvia il servizio
sudo systemctl daemon-reload
sudo systemctl enable threatintel
sudo systemctl start threatintel

echo "✅ Setup completato!"
echo "🌐 Il sistema è disponibile su: http://$(hostname -I | awk '{print $1}')"
echo "📊 API stats: http://localhost/api/stats"
echo "📋 Status servizio: sudo systemctl status threatintel"
echo "📝 Log applicazione: sudo journalctl -u threatintel -f"
echo "📝 Log Nginx: sudo tail -f /var/log/nginx/access.log"
