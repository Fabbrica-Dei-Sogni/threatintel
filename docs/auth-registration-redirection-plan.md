# 🛰️ Piano di Consolidamento: Redirect Registrazione (Agnostico)

## Obiettivo
Migliorare l'esperienza utente (UX) durante il processo di registrazione. Attualmente, dopo l'attivazione dell'account tramite email, il modulo Auth restituisce un JSON di successo. L'obiettivo è reindirizzare automaticamente l'utente alla pagina di login dell'applicazione specifica (es. Dashboard ThreatIntel), mantenendo il modulo Auth agnostico rispetto all'applicazione chiamante.

## Strategia di Implementazione

### 1. Identificazione Applicazione (appId)
- Durante la registrazione (`POST /auth/register`), il frontend deve inviare un `appId` univoco (es. `threat-intel-01`).
- Il modulo Auth salva questo `appId` nel profilo dell'utente (campo `authorizedApps` o metadati di attivazione).

### 2. Mappatura Redirect (Modulo Auth)
- Aggiungere una configurazione nel modulo Auth (file `config.ts` o variabili d'ambiente) che associ ogni `appId` a un URL di atterraggio specifico.
- Esempio di mappatura:
  ```typescript
  const appRedirects = {
    'threat-intel-01': 'https://dashboard.threatintel.it/login?activated=true',
    'default-app': '/api/v1/auth/activate/success'
  };
  ```

### 3. Logica di Attivazione (Redirect 302)
- Modificare l'endpoint di attivazione (`GET /auth/activate?token=...`):
  1. Validare il token.
  2. Attivare l'utente.
  3. Recuperare l' `appId` associato.
  4. Se esiste un URL di redirect configurato per quel `appId`, eseguire un `res.redirect(url)`.
  5. In caso contrario, restituire il JSON di successo attuale per compatibilità.

## Vantaggi
- **UX Fluida**: L'utente viene riportato direttamente nell'app pronta per l'uso.
- **Agnosticismo**: Il modulo Auth non deve conoscere la struttura interna dell'app, solo l'URL di login fornito in configurazione.
- **Parametrizzazione**: L'URL può includere parametri (es. `?activated=true`) per permettere al frontend di mostrare messaggi di successo personalizzati.

---
**Data di definizione**: 2026-04-19  
**Stato**: ⚪ Pianificato (Roadmap)
