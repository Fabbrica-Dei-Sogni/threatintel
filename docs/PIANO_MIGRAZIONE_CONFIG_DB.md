# Piano di Migrazione Configurazione su Database

Questo documento delinea la strategia per migrare i parametri di configurazione dal file `.env` a MongoDB, garantendo flessibilità, robustezza e facilità di gestione tramite Dashboard.

## 1. Visione Architetturale: Gerarchia a 3 Livelli

Per evitare il problema della "testa che mangia la coda" (lock-out) e garantire stabilità, ogni parametro verrà risolto seguendo questa priorità:

1.  **LIVELLO 0: Environment Override (.env / Service)**
    *   *Uso*: Emergenza o configurazione fissa dell'infrastruttura.
    *   *Comportamento*: Se una variabile è definita nel `.env`, vince su tutto.
2.  **LIVELLO 1: Database Master (MongoDB)**
    *   *Uso*: Gestione operativa quotidiana tramite Dashboard.
    *   *Comportamento*: Valore dinamico, modificabile senza riavvio del servizio.
3.  **LIVELLO 2: Software Defaults (ConfigUtils)**
    *   *Uso*: Fallback assoluto.
    *   *Comportamento*: Garantisce che l'app parta anche con DB vuoto e senza `.env`.

---

## 2. Sezioni Logiche e Schemi

Invece di un semplice Key-Value piatto, utilizzeremo **Schemi Strutturati** per raggruppare i parametri correlati.

### A. Sezione AI & RAG
**Scopo**: Gestire il "cervello" dell'assistente e le connessioni ai motori vettoriali.

*   **Parametri**:
    *   `RAG_ENABLED` (Boolean)
    *   `OLLAMA_URL` (String)
    *   `QDRANT_URL` (String)
    *   `EMBEDDING_MODEL` (String)
    *   `SUMMARY_MODEL` (String)
    *   `RAG_COLLECTION_NAME` / `RAG_LOGS_COLLECTION_NAME` (String)
    *   `RAG_AI_SUMMARY_ENABLED` (Boolean)

### B. Sezione Intelligence & Scoring
**Scopo**: Tarare la sensibilità del sistema di rilevamento attacchi.

*   **Parametri**:
    *   `DANGER_WEIGHT_RPSNORM` (Number)
    *   `DANGER_WEIGHT_DURNORM` (Number)
    *   `DANGER_WEIGHT_SCORENORM` (Number)
    *   `DANGER_WEIGHT_UNIQUETECHNORM` (Number)
    *   `ANALYZE_INTERVAL` (String/Time)
    *   `PRUNING_ENABLED` (Boolean)

### C. Sezione Filtri & Trappole (Operational)
**Scopo**: Gestire whitelist e endpoint sensibili.

*   **Parametri**:
    *   `COMMON_ENDPOINTS` (Array di stringhe)
    *   `EXCLUDED_IPS` (Array di stringhe/CIDR)
    *   `IP_CACHE_MAX_AGE_HOURS` (Number)

---

## 3. Strategia di Implementazione (Roadmap)

### Fase 1: Setup Infrastrutturale
1.  Creazione dei modelli Mongoose dedicati (`AIConfigSchema`, `IntelligenceConfigSchema`, etc.).
2.  Aggiornamento di `AppConfigProvider.ts` per supportare la logica di fallback asincrona.
3.  Implementazione di una **cache in memoria** nel Provider per non sovraccaricare il database durante il logging intensivo.

### Fase 2: Migrazione AI (Pilota)
1.  Spostamento dei parametri AI su DB.
2.  Logica di "Auto-Seeding": al primo avvio, l'app legge il `.env` e scrive su DB se la collezione è vuota.
3.  Creazione `AIConfigController` per gestire la sezione dalla Dashboard.

### Fase 3: Estensione alle altre sezioni
1.  Migrazione progressiva di Intelligence e Filtri.
2.  Bonifica finale del file `.env` (lasciando solo Mongo, Auth e segreti API).

---

## 4. Note sulla Sicurezza e Manutenibilità

*   **Audit Trail**: Ogni modifica su DB tramite Dashboard dovrà essere loggata per sapere chi ha cambiato un peso o disabilitato il RAG.
*   **Validazione**: Gli endpoint POST per la configurazione devono validare i tipi di dato (es. i pesi devono sommare 1.0) prima di salvare su DB.
*   **Fail-Safe**: L'identità dell'applicazione (`APP_ID`) e l'endpoint di autenticazione (`URI_DIGITAL_AUTH`) **NON** verranno migrati su DB per garantire l'accesso in ogni condizione.
