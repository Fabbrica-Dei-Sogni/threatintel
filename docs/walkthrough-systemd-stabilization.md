# Walkthrough: Stabilizzazione Servizio Systemd e Allineamento Node.js

Questo documento descrive i passaggi effettuati per risolvere il crash ciclico del servizio `threatintel.service` e garantire la compatibilità con le ultime dipendenze del progetto.

## Diagnosi del Problema
Analizzando i log di sistema e i binari, sono state identificate due cause principali:
1.  **Mismatch di versione Node.js**: Il servizio tentava di utilizzare la versione di sistema (**v18.20.4**), mentre il progetto richiede funzionalità e dipendenze (come `axios` v1.15+ e `typescript` v5.9) compatibili solo con versioni più recenti.
2.  **OpenSSL 3.0 Incompatibility**: Node.js v17+ utilizza OpenSSL 3.0, che per impostazione predefinita disabilita gli algoritmi crittografici legacy utilizzati da alcuni worker di background.

## Interventi Effettuati

### 1. Configurazione del Servizio Systemd
Il file di unità `/etc/systemd/system/threatintel.service` (e la sua copia in `threatintel.service` nella root del progetto) è stato aggiornato con le seguenti impostazioni:

- **Forzatura Path**: Inclusione del percorso dei binari NVM dell'utente `amodica` nella variabile `PATH`.
- **Eseguibile v24**: Puntata esplicita a `/home/amodica/.nvm/versions/node/v24.6.0/bin/npm`.
- **Legacy Provider**: Aggiunta di `Environment=NODE_OPTIONS=--openssl-legacy-provider`.

### 2. Ottimizzazione Bootstrap del Server
In `server.ts`, è stato anticipato il caricamento delle variabili d'ambiente:
```typescript
import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config(); // Caricamento immediato prima del bootstrap DI
```
Questo assicura che il `LifecycleManager` e i servizi dipendenti (come `AuthService`) leggano correttamente le configurazioni dal file `.env` fin dal primo istante.

## Esito e Verifica
Il servizio è ora operativo e monitorato correttamente:
- **Bash Completion**: Il servizio è registrato tramite `systemctl link`, rendendolo visibile all'autocompletamento della shell.
- **Stabilità**: I log confermano l'avvio di tutti i moduli: `SshLogService`, `NginxLogService`, `CowrieService`, `AnalysisService`.

---
> [!TIP]
> Per verificare lo stato in tempo reale, utilizzare: `sudo systemctl status threatintel.service` o `sudo journalctl -u threatintel.service -f`.
