# ThreatIntel Backend: Workflow di Release (v2.0)

Questo documento descrive l'architettura e le procedure operative per la gestione del ciclo di vita delle release del backend.

## 🎯 Obiettivi
1.  **Portabilità**: Esecuzione senza `node_modules` (Bundling NCC).
2.  **Isolamento**: Supporto a istanze multiple parallele (Prod, Beta, Test) sullo stesso host.
3.  **Sicurezza**: Distribuzione di codice compilato, senza sorgenti `.ts`.
4.  **Automazione**: Gestione semplificata via CLI interattiva.

---

## 🏗️ Architettura Ibrida

L'artefatto generato (`artifact/*.tar.gz`) è un pacchetto auto-contenuto:

```text
deployment-folder/
├── index.js              # Bundle unico (Codice + Dipendenze JS)
├── VERSION               # Metadato versione (es. 1.0.0)
├── data/                 # Database binari GeoIP (.dat)
├── infra/                # Script check Redis/MongoDB
├── install.sh            # Installer idempotente
└── uninstall.sh          # Uninstaller con discovery tagging
```

---

## 🛠️ Toolchain Operativa (`scripts/build/`)

### 📦 1. Creazione Release
```bash
./scripts/build/interactive-release.sh
```
- Chiede la versione (default da `package.json`).
- Genera il bundle in `artifact/`.
- Estrae automaticamente il bundle in `deployments/{servizio}/`.
- Opzionalmente registra il servizio su systemd.

### 🚀 2. Deploy Differito
Se hai già buildato un bundle ma non lo hai ancora attivato:
```bash
./scripts/build/deploy-pending.sh
```
- Scansiona `deployments/` e ti permette di attivare i bundle "dormienti".

### 🗑️ 3. Unistallazione
```bash
./scripts/build/uninstall-release.sh
```
- Individua tutti i servizi gestiti dal workflow tramite il tag `Managed-By`.
- Rimuove in modo pulito i link simbolici da `/etc/systemd/system/`.

### 🧹 4. Pulizia Ambiente
```bash
./scripts/build/clean-release.sh
```
- Rimuove i file temporanei di build e gli artefatti, **ma preserva** le cartelle in `deployments/` per non interrompere i servizi attivi.

---

## ⚙️ Logica Tecnica Idempotente

### Symbolic Links
Invece di copiare i file in `/etc/systemd/system/`, l'installer crea dei **Link Simbolici**.
- **Vantaggio**: Puoi modificare la configurazione del servizio direttamente nella sua cartella in `deployments/` e fare un `daemon-reload` senza toccare le cartelle di sistema.

### Versioning
La versione viene iniettata in tre posti:
1.  **Nome file**: `threatintel-bundle-v1.0.0-20260326.tar.gz`.
2.  **Systemd Description**: Visibile via `systemctl status`.
3.  **Environment Variable**: L'app può leggere `process.env.VERSION`.

---
> [!TIP]
> Per aggiungere nuove istanze parallele, basta dare un nome diverso al servizio durante il prompt di `interactive-release.sh`. Lo script creerà una cartella isolata e una porta dedicata.
