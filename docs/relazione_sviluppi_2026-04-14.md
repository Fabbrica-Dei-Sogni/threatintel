# Relazione Sviluppi Tecnici - 14 Aprile 2026

Questa documentazione riassume gli interventi effettuati sul progetto `threatintel` per stabilizzare l'infrastruttura backend/frontend e risolvere regressioni post-refactoring.

## 1. Sicurezza e Autenticazione (Frontend)
### [feat] Iniezione Token JWT e Gestione Intercettori
- **Problema**: Le chiamate alla configurazione dell'honeypot e ai log restituivano errore `401 Unauthorized` perché il token JWT non veniva inviato negli header.
- **Soluzione**: Implementato un interceptor Axios in `frontend/dashboard/src/api/config.ts` che:
    - Estrae automaticamente il token da `localStorage`.
    - Inietta l'header `Authorization: Bearer <token>`.
    - Gestisce errori di risposta centralizzati.

## 2. Robustezza e Type Safety (Backend)
### [refactor] Risoluzione Errori di Compilazione TS2345
- **Problema**: Dopo l'aggiornamento di Express, `req.params` veniva interpretato come `string | string[]`, causando 18 errori di tipo nei controller che si aspettavano solo `string`.
- **Soluzione**: Applicato casting esplicito (`as string`) in:
    - `ThreatController.ts`
    - `CowrieController.ts`
    - `DossierController.ts`
    - `ConfigController.ts`
- **Dependency Injection**: Aggiornata l'inizializzazione del `CowrieController` nei test per includere `I18nService`.

## 3. Infrastruttura e Stabilità Servizio
### [fix] Stabilizzazione threatintel.service
- **Mismatch Node.js**: Identificata discrepanza tra la versione di sistema (**v18**) e quella di sviluppo (**v24**). Il servizio è stato configurato per utilizzare il PATH assoluto di NVM.
- **OpenSSL 3.0 Compatibility**: Risolto l'errore `digital envelope routines::unsupported` tramite l'abilitazione di `NODE_OPTIONS=--openssl-legacy-provider`.
- **Sincronizzazione Unità**: Sincronizzato il file `threatintel.service` nella root del progetto con quello attivo in `/etc/systemd/system/`.
- **Ottimizzazione Bootstrap**: Spostata la configurazione di `dotenv` in cima a `server.ts` per garantire il caricamento delle variabili d'ambiente prima dell'inizializzazione dei decoratori e del container DI.

---
> [!NOTE]
> Il sistema è attualmente in stato **STABLE**. I servizi di background (SSH, Nginx, Cowrie, Analysis) sono operativi e monitorati correttamente da `systemctl`.
