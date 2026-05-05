# ThreatIntel Backend: Workflow di Release (v2.1)

Questo documento descrive l'architettura e le procedure operative per la gestione del ciclo di vita delle release del backend, con supporto nativo alla modularizzazione di Nginx e all'isolamento multi-istanza.

## 🎯 Obiettivi
1.  **Portabilità**: Esecuzione senza `node_modules` (Bundling NCC).
2.  **Isolamento**: Supporto a istanze multiple parallele (Prod, Beta, Test) sullo stesso host.
3.  **Sicurezza**: Distribuzione di codice compilato, senza sorgenti `.ts`.
4.  **Automazione**: Gestione semplificata via CLI interattiva per Backend e Proxy.

---

## 🏗️ Architettura Ibrida

L'artefatto generato (`artifact/*.tar.gz`) è un pacchetto auto-contenuto:

```text
deployment-folder/
├── index.js              # Bundle unico (Codice + Dipendenze JS)
├── VERSION               # Metadato versione (es. 1.0.0)
├── data/                 # Database binari GeoIP (.dat)
├── infra/                # Script check Redis/MongoDB
├── proxy/                # Template Nginx (Globals + Vhost)
├── install.sh            # Installer idempotente (Systemd + Nginx)
└── uninstall.sh          # Uninstaller con discovery tagging
```

---

## ⚙️ Logica Tecnica Idempotente

### Isolamento Multi-Istanza
Il sistema supporta l'esecuzione di più istanze parallele sullo stesso host senza conflitti di risorse o di log.

1.  **Nginx Modularization**: Le configurazioni Nginx sono separate in `globals` (formati log, rate limits) e `vhost` (trap multiplexing). Questo evita di modificare il file `nginx.conf` di sistema.
2.  **Log Atomicity**: Ogni istanza utilizza un prefisso unico nel Journal di sistema (es. `nginx_threat_{SERVICE_NAME}:`).
3.  **Ambiente Isolato**: L'installer inietta la variabile `NGINX_LOG_PREFIX` nel servizio systemd, permettendo al backend di filtrare solo i propri log strutturati.

### Symbolic Links
Invece di copiare i file nelle cartelle di sistema, l'installer crea dei **Link Simbolici**.
- **Systemd**: `/etc/systemd/system/{servizio}.service` -> `deployments/{servizio}/{servizio}.service`
- **Nginx Globals**: `/etc/nginx/conf.d/threatintel_globals_{servizio}.conf` -> `deployments/{servizio}/proxy/...`
- **Nginx Vhost**: `/etc/nginx/sites-enabled/{servizio}.conf` -> `deployments/{servizio}/proxy/...`

**Vantaggio**: Le modifiche alle configurazioni nella cartella di deploy sono immediatamente visibili al sistema dopo un reload.

---

## 🛠️ Toolchain Operativa

### 📦 1. Creazione Release
```bash
./scripts/build/interactive-release.sh
```
- Compila il bundle con NCC.
- Prepara i template Nginx e Systemd risolvendo le variabili (Porte, Percorsi Node, Nomi Servizio).
- Crea una cartella atomica in `deployments/`.

### 🚀 2. Installazione
```bash
cd deployments/{servizio}/ && ./install.sh
```
- Registra il servizio systemd.
- **Configurazione Nginx**: Collega i file modulari e verifica la sintassi automaticamente.
- Gestisce il rilevamento del binario Node.js (compatibile con NVM e versioni multiple).

### 🗑️ 3. Unistallazione
```bash
./scripts/build/uninstall-release.sh
```
- Individua tutti i servizi gestiti tramite il tag `Managed-By`.
- Rimuove in modo pulito i link simbolici da `/etc/systemd/system/`.

---
> [!TIP]
> Per aggiungere nuove istanze parallele, basta dare un nome diverso al servizio durante il prompt di `interactive-release.sh`. Il sistema garantirà che log, porte e limiti siano isolati per quella specifica istanza.
