# Nginx Configuration for ThreatIntel (Modular Setup)

Questa cartella contiene le configurazioni Nginx ottimizzate per il sistema di Threat Intelligence. La configurazione è stata progettata per essere **modulare** e **non invasiva**, permettendo l'installazione senza modificare il file `nginx.conf` originale del sistema.

## 🏗️ Architettura dei File

| File | Destinazione Consigliata | Ruolo |
| :--- | :--- | :--- |
| **`threatintel_globals.conf`** | `/etc/nginx/conf.d/` | Definizioni globali: Formato log JSON, Zone di Rate Limiting, Security Headers. |
| **`threatintel.conf`** | `/etc/nginx/sites-enabled/` | Virtual Host: Multiplexing porte Trap, Proxy verso Node.js (porta 3999). |

## 🚀 Installazione Rapida

Per attivare la configurazione tramite link simbolici (metodo consigliato per mantenere i file sincronizzati con il repository):

```bash
# 1. Collega le configurazioni globali (Log format e Rate Limit)
sudo ln -sf $(pwd)/threatintel_globals.conf /etc/nginx/conf.d/threatintel_globals.conf

# 2. Collega il Virtual Host
sudo ln -sf $(pwd)/threatintel.conf /etc/nginx/sites-available/threatintel.conf

# 3. Abilita il sito
sudo ln -sf /etc/nginx/sites-available/threatintel.conf /etc/nginx/sites-enabled/threatintel.conf

# 4. Verifica la sintassi e ricarica
sudo nginx -t && sudo systemctl reload nginx
```

## 🛡️ Caratteristiche Tecniche

### Honeypot Multiplexing
Il file `threatintel.conf` è configurato per ascoltare su molteplici porte "trap" (es. 8080, 5000, 7000). Tutto il traffico su queste porte viene inoltrato al backend Node.js.

### Header `X-Server-Port`
Viene passato l'header `X-Server-Port $server_port` al backend. Questo permette all'applicazione di identificare su quale porta specifica l'attaccante ha tentato la connessione, informazione fondamentale per l'analisi forense.

### Logging JSON
I log di accesso vengono scritti in `/var/log/nginx/threatintel_access.log` utilizzando il formato `json_threatintel`. Questo formato strutturato permette al `NginxLogService` di processare le minacce in tempo reale senza errori di parsing.

### Sicurezza
- **Rate Limiting**: Protezione contro brute-force e DoS tramite zone `general` e `login`.
- **Hiding**: `server_tokens off` e protezione dei file nascosti (`.env`, `.git`).
- **Headers**: Inclusione di `X-Frame-Options`, `X-Content-Type-Options` e `Referrer-Policy`.

---
**Nota**: Assicurarsi che i certificati SSL (se utilizzati) siano presenti nei percorsi specificati nel vhost prima di ricaricare Nginx.
