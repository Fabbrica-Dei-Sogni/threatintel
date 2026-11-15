# Documentazione Integrazione Autenticazione ThreatIntel

Questo documento riassume le modifiche architetturali apportate per integrare correttamente il sistema di Identity Provider (`digital-auth-ts`) nel core di `threatintel`.

## Stato corrente verificato

Verificato sulla codebase al 15 novembre 2026. ThreatIntel delega la verifica del token a `digital-auth-ts`: `AuthService.verify` invia l'`appId` nel body e nell'header `x-app-id`, quindi restituisce l'utente fornito dall'IdP. Il popolamento e la persistenza dei ruoli restano responsabilità dell'IdP; il codice ThreatIntel deve interpretare correttamente le forme ricevute.

- Il middleware backend accetta ruoli come stringhe (`"admin"`), oggetti flat (`{ name: "admin" }`) o oggetti annidati (`{ role: { name: "admin" } }`).
- `superadmin` soddisfa i controlli `hasRole` e i controlli amministrativi del dossier.
- La dashboard applica il vincolo `appId` al ruolo `admin` annidato; un `superadmin` è globale e un ruolo senza `appId` è trattato come non vincolato.
- `AuthMiddleware.hasRole` confronta il nome del ruolo e non applica un filtro `appId`; la verifica dell'applicazione viene inoltrata all'IdP tramite `AuthService.verify`.
- Gli interceptor API della dashboard reindirizzano al login solo per risposte HTTP `401`; un `403` resta un errore di autorizzazione e non provoca quel redirect.
- I test di `AuthMiddleware` coprono le tre forme del ruolo, `superadmin` e il rifiuto di ruoli insufficienti.

Queste regole descrivono il consumo del payload in ThreatIntel, non garantiscono da sole che l'IdP restituisca ruoli corretti o autorizzi l'utente per l'applicazione.

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
- **Payload di verifica**: ThreatIntel usa l'oggetto `user` restituito dall'endpoint `/verify` dell'IdP. I dettagli interni di query, popolamento e serializzazione Mongoose appartengono al repository `digital-auth-ts` e vanno verificati lì.
- **Interpretazione dei ruoli**: La correzione corrente rende il middleware backend e i controlli amministrativi del dossier compatibili con ruoli flat, annidati o stringa, e riconosce `superadmin`. La dashboard applica inoltre il controllo dell'`appId` per i ruoli `admin` associati a un'applicazione.

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
