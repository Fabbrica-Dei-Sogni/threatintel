# Technical Walkthrough: Mission Control & Background Job System

Questo documento descrive l'architettura e l'implementazione del sistema **Mission Control**, introdotto per gestire operazioni di sistema a lunga durata (long-running jobs) in modo asincrono, resiliente e trasparente per l'utente.

## 🎯 Obiettivi
- **Asincronicità:** Avviare operazioni pesanti (es. rianalisi log, pruning) senza bloccare le API.
- **Resilienza:** Gestire correttamente i riavvii del server, evitando job "zombie" bloccati in stato `RUNNING`.
- **Monitoraggio Real-time:** Fornire feedback all'utente sullo stato di avanzamento (progress %), metadati (record processati/errori) e cronologia.
- **Scalabilità:** Permettere l'aggiunta di nuovi tipi di job con il minimo sforzo architettonico.

## 🏗️ Architettura Backend

### 1. Data Model (`AnalysisJobSchema`)
Ogni operazione viene registrata su MongoDB per garantirne la persistenza.
- **Campi Chiave:** `type`, `status` (pending, running, completed, failed, cancelled), `progress`, `metadata`, `startedAt`, `completedAt`.

### 2. BackgroundJobManager (`BackgroundJobManager.ts`)
Il cuore del sistema, implementato come singleton nel container DI.
- **Startup Cleanup:** All'avvio, il manager esegue `cleanupStaleJobs()` per marcare come `FAILED` tutti i job rimasti in `RUNNING` o `PENDING` (zombie jobs dovuti a shutdown improvvisi).
- **Job Execution:** Utilizza il DI container per risolvere l'istanza specifica del job basata sul `type`.
- **Lifecycle Management:** Gestisce l'aggiornamento degli stati sul DB e mantiene una mappa in memoria (`activeJobs`) per le istanze effettivamente in esecuzione, permettendo l'annullamento (`stopJob`).

### 3. IBackgroundJob Interface
Tutti i job devono implementare questa interfaccia:
- `execute(jobId, params)`: Logica principale del job.
- `stop()`: Metodo per l'arresto controllato.

## 🏗️ Architettura Frontend

### 1. Pinia Store (`useJobStore.ts`)
Lo stato dei job è centralizzato in uno store globale per sopravvivere alla navigazione tra le pagine.
- **Auto-Monitoring:** Al caricamento, lo store recupera i job recenti e riavvia automaticamente il polling per quelli ancora attivi.
- **Polling Intelligente:** Esegue richieste frequenti solo quando ci sono job attivi, fermandosi automaticamente quando la coda è vuota.

### 2. Componente UI (`JobMonitor.vue`)
Un cruscotto operativo ("Mission Control") che visualizza:
- **Operazioni Attive:** Con barre di progresso e pulsanti di terminazione.
- **Comandi Disponibili:** Pulsanti per avviare nuovi job (es. Rianalisi).
- **Cronologia:** Lista dei log recenti, ora visualizzabile on-demand tramite toggle per migliorare l'ergonomia.

## 🛠️ Funzionalità Avanzate

### Gestione degli Errori e Zombie Jobs
Il sistema è progettato per non lasciare mai l'utente nel dubbio:
- Se un job crasha, il manager cattura l'eccezione e aggiorna il DB con il messaggio d'errore.
- Se il server viene riavviato, il cleanup automatico al boot "pulisce" la UI.
- È stata introdotta la funzione **Purge (Elimina)** che permette di rimuovere definitivamente i record dei job (sia attivi che storici) dal database.

### Ergonomia e UX
- **History Toggle:** I log passati sono nascosti di default per focalizzare l'attenzione sulle operazioni correnti.
- **Inline Confirmation:** I comandi distruttivi o pesanti (come la rianalisi totale) richiedono una conferma rapida direttamente sul pulsante.

## 🚀 Scalabilità Futura
Per aggiungere un nuovo job (es. "Data Pruning"):
1. Creare una classe che implementa `IBackgroundJob`.
2. Registrare il token in `tokens.ts`.
3. Aggiungere il tipo nel metodo `resolveTokenByType` del `BackgroundJobManager`.
4. Aggiungere il pulsante di attivazione nel `JobMonitor.vue`.

---
*Documentazione creata il: 2026-05-06*
*Versione: 1.0.0*
