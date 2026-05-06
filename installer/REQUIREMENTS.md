# Requisiti di Sistema - ThreatIntel Core

Questo documento elenca i requisiti hardware e software necessari per l'installazione e il corretto funzionamento del sistema di Threat Intelligence.

## 1. Requisiti Software

### Ambiente di Runtime
*   **Node.js**: Versione minima consigliata **v20.x** (LTS) o superiore. 
    *   *Nota*: Il sistema è stato testato e validato su **v24.6.0**.
    *   È richiesto l'uso di `npm` per la gestione delle dipendenze.
*   **Sistema Operativo**: Linux (testato su Ubuntu 22.04+ / Debian 11+).

### Infrastruttura (Database & Cache)
Il software richiede i seguenti servizi attivi (solitamente gestiti tramite Docker):
*   **MongoDB**: Versione **4.4** o superiore.
*   **Redis**: Versione **6.0** o superiore (necessario per il Rate Limiting e la Blacklist).
*   **Qdrant**: Versione **1.7+** (necessario se il modulo RAG/AI è abilitato).
*   **Ollama**: (Opzionale) per il supporto ai modelli AI locali.

### Rete & Proxy
*   **Nginx**: Necessario come Reverse Proxy per gestire SSL e il forwarding dei log verso il modulo forense.

---

## 2. Requisiti Hardware

Le risorse necessarie variano in base al volume di traffico e all'attivazione dei moduli AI.

### Profilo Minimo (Solo Logging & Analisi Base)
*   **CPU**: 1 Core.
*   **RAM**: 1 GB.
*   **Disco**: 5 GB (SSD consigliato per le performance del database).

### Profilo Consigliato (Full Stack con RAG & Analisi AI)
*   **CPU**: 2+ Core (per gestire i worker di sincronizzazione asincrona).
*   **RAM**: 4 GB o superiore (necessario se Ollama gira sullo stesso server).
*   **Disco**: 10 GB+ (per lo storage dei log e dei vettori AI).

---

## 3. Note sull'Installazione
Il sistema è progettato per essere installato tramite il workflow automatizzato:
1. Generazione della release: `installer/build/interactive-release.sh`
2. Installazione del servizio: `deployments/NOME_SERVIZIO/install.sh`

Per maggiori dettagli sulla procedura di deployment, consultare la documentazione in `docs/backend-release-workflow.md`.
