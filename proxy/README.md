Documentazione riguardo le configurazioni nginx 
# Nginx formato json

Per fornire il formato json al logging di nginx si aggiunge la configurazione

`threatintel_logging.conf`

il conf si puo copiare direttamente nella folder

`/etc/nginx/conf.d/`

oppure eseguire un link simbolico al .conf di progetto come primo "setup"

# Nginx Stream Proxy — Porte TCP non-HTTP

Guida per configurare nginx come proxy TCP per protocolli non-HTTP (Telnet, MQTT, ecc.)
usando il modulo `ngx_stream_module`.

---

## Il problema

Il blocco `http {}` di nginx gestisce solo traffico HTTP/HTTPS.
Per proxare protocolli TCP raw come **Telnet (porta 23)**, **MQTT (1883)**, **Redis (6379)**
serve il modulo **stream**, che opera a livello TCP/UDP puro.

Update: al momento non e' necessario ascoltare la porta telnet 23 dal proxy in quanto il binding avviene direttamente dentro l'ambiente docker di cowrie.
Indagare su come fornire al cowrie l'header nginx - richiede un fix ad hoc sul codice cowrie.

---

## Installazione modulo dinamico (Debian/Ubuntu)

```bash
sudo apt install libnginx-mod-stream -y
```
Il modulo viene installato in ```/usr/lib/nginx/modules/ngx_stream_module.so.```

Aggiungi questa riga in cima a ```/etc/nginx/nginx.conf```, prima di qualsiasi blocco:

Il blocco stream {} deve stare al livello root, mai dentro http {}:


```
load_module modules/ngx_stream_module.so;
```

load_module modules/ngx_stream_module.so;  # solo se modulo dinamico

```
events {
    worker_connections 1024;
}

http {
    # ... configurazione HTTP esistente ...
    include /etc/nginx/sites-enabled/*;
}

stream {
    include /etc/nginx/stream.d/*.conf;
}
```
Crea ```/etc/nginx/stream.d/telnet.conf```:

```
upstream cowrie_telnet {
    server 127.0.0.1:2323;
}

server {
    listen 23;
    proxy_pass cowrie_telnet;
    proxy_timeout 600s;
    proxy_connect_timeout 10s;
}
```