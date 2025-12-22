# Walkthrough: Dashboard PWA & Runtime Config

Questo documento descrive l'implementazione del supporto PWA (Progressive Web App) e della configurazione dell'API a runtime per la Threat Intelligence Dashboard.

## Obiettivi Raggiunti

1.  **Trasformazione PWA**: La dashboard è ora installabile su dispositivi Android/iOS come un'app nativa.
2.  **Configurazione Dinamica**: Possibilità di cambiare l'URL del backend senza ricompilare il frontend.
3.  **Retrocompatibilità**: Il sistema continua a funzionare con l'URL predefinito se non viene specificata una configurazione personalizzata.

## Dettagli Tecnici

### 1. Progressive Web App (PWA)
È stato integrato il plugin `@vitejs/plugin-pwa` per la gestione automatica di:
- **Manifest**: Definito in `vite.config.ts`, include icone, colori del tema e modalità di visualizzazione `standalone`.
- **Service Worker**: Generato automaticamente in fase di build (`sw.js`).
- **Asset**: Aggiunte icone `pwa-192x192.png` e `pwa-512x512.png` nella cartella `public/`.

### 2. Runtime API Configuration
Il client API (`src/api/index.ts`) è stato refactorizzato per utilizzare un URL dinamico:
- **Priorità**: `localStorage ('api_url')` > `VITE_APP_API_URL` (build env) > Fallback hardcoded.
- **Aggiornamento Live**: Un interceptor di Axios assicura che ogni richiesta utilizzi l'URL attualmente salvato.

### 3. Integrazione UI
- **Settings View**: Nuova pagina dedicata (`/settings`) per l'inserimento e il reset dell'URL API.
- **Accesso Rapido**: Un pulsante flottante (ingranaggio) è sempre visibile in basso a destra per permettere lo switch rapido tra diversi honeypot.
- **Navigazione**: Aggiunto un pulsante di chiusura (X) nella vista settings per tornare alla dashboard.

## Guida all'Installazione su Android

1.  Aprire Chrome su Android e navigare all'URL della dashboard.
2.  Attendere il tasto **"Installa app"** o selezionarlo dal menu dei tre puntini (⋮).
3.  L'app apparirà nella schermata Home e nel drawer, pronta per l'uso a tutto schermo.

## Verifica Build
Il comando `npm run build` genera correttamente tutti gli asset nella cartella `dist/`, inclusi i manifest e il service worker necessari per la PWA.
