#!/bin/bash

echo "🚀 Setup Threat Intelligence System"

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
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3999
Environment=MONGO_URI=mongodb://intelagent:intelagent@127.0.0.1:17017/threatinteldb

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
