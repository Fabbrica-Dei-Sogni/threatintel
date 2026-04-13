# Documentazione Integrazione Autenticazione ThreatIntel

Questo documento riassume le modifiche architetturali apportate per integrare correttamente il sistema di Identity Provider (`digital-auth-ts`) nel core di `threatintel`.

## 🛡️ Interventi Effettuati

L'obiettivo era risolvere i blocchi CORS, gli errori SMTP e le incongruenze nei permessi Admin (RBAC).

### 1. Architettura di Rotte e Middleware
- **Separazione Public/Private**: In `core/endpoint.ts`, le rotte di autenticazione (`/api/auth/*`) sono state spostate al di fuori del middleware di protezione globale. Questo permette la registrazione e il login pubblico senza richiedere un token preventivo.
- **CORS Preflight Patch**: `AuthMiddleware.ts` è stato aggiornato per ignorare le richieste `OPTIONS`. Questo risolve i blocchi 401 durante l'handshake CORS del browser verso il backend.
- **Server Binding**: Configurato il binding su `0.0.0.0` in `server.ts` per garantire la comunicazione cross-container via Nginx.

### 2. Sicurezza e SMTP (Layer di Produzione)
- **Zero-Secrets in Git**: Le passkey SMTP sono state rimosse dai file `.env`. 
- **Dynamic Env Loading**: È stato implementato un sistema a variabili d'ambiente di sistema. Tramite `export SMTP_PASSKEY=$(cat ~/.passkeyGoogle)` nella shell dell'utente linux e il mapping in `release.yml`, la password viene iniettata nel container in runtime senza mai essere scritta su file persistenti nel repository.

### 3. Integrità Dati e RBAC (Fix Critici)
- **Popolamento Ruoli**: Corretto il processo di login dell'IdP. Ora restituisce l'oggetto `user` completo di ruoli popolati (`admin`, `user`). Senza questo, il frontend non riconosceva i permessi dell'amministratore.
- **Serializzazione Lean**: Implementato l'uso di `.lean()` nelle query Mongoose dell'IdP. Questo ha risolto gli errori "contraddittori" (Token valido ma oggetto utente non riconosciuto) dovuti alla complessità degli oggetti Mongoose durante la serializzazione JSON di Axios.

---

## 🔧 Guida alla Manutenzione

Per mantenere nel tempo il layer di autenticazione, segui queste linee guida:

### Ciclo di Rilascio IdP
Quando modifichi il codice nel repository `digital-auth-ts`:
1.  **Versioning**: Esegui `npm run patch` per incrementare la versione (es. da 1.0.15 a 1.0.16).
2.  **Publish**: Esegui `npm publish` per spingere la nuova versione sul registro Nexus (`alessandromodica.com:8081`).
3.  **Allineamento Core**: Aggiorna il file `compose/release.yml` nel repository `digital-auth-ts` puntando alla nuova versione in `NPM_VERSION`.
4.  **Rebuild**: Esegui `docker compose up --build -d` per scaricare la nuova patch nel container di produzione.

### Debbugging
Se un utente segnala "Permessi insufficienti" nonostante sia Admin:
- Verifica che il campo `authorizedApps` nel database `authdb` contenga l'ID dell'app (es: `threat-intel-01`).
- Assicurati che il ruolo `admin` sia presente nell'array roles dell'utente.

---

## 🚀 Evoluzione Futura: Nginx `auth_request`

Il sistema è già predisposto per essere agnostico e delegare la verifica a Nginx per aumentare le performance.

### Passaggi per la migrazione:
1.  **Nginx Config**: Inserire il modulo `auth_request` nel file `.conf` di Nginx:
    ```nginx
    location /api/ {
        auth_request /auth/verify;
        proxy_pass http://threatintel_core;
    }
    
    location = /auth/verify {
        internal;
        proxy_pass https://alessandromodica.com:3443/auth/api/v1/verify;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
    }
    ```
2.  **IdP Endpoint**: Abbiamo già creato l'endpoint `GET /verify` nel file `auth.ts` dell'IdP, che legge il token dai cookie HttpOnly o dall'authorization header e restituisce `200` o `401`.
3.  **Core Cleanup**: Una volta attivo Nginx `auth_request`, potrai rimuovere l'`AuthMiddleware` dal codice Node.js del core, poiché le richieste arriveranno al backend solo se Nginx le ha già validate.

> [!IMPORTANT]
> Ricordati che l'attuale implementazione usa il modulo `AuthService` come proxy interno. Questo è ottimo per il debugging locale ma introduce latenza rispetto alla soluzione Nginx.

---

© 2026 - ThreatIntel Security Integration Manual
