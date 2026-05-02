# Agentic RAG Integration Guide: Threat Intelligence Pipeline

Questa guida documenta l'architettura, i passaggi di sviluppo e le best practice implementate per integrare un flusso RAG (Retrieval-Augmented Generation) di classe enterprise nel progetto ThreatIntel. L'obiettivo è rendere i dati forensi fruibili in modo trasparente sia da un frontend classico che da un Agente AI (es. ChainPrompt).

---

## 1. Visione Architetturale: Agentic RAG

A differenza di un RAG tradizionale che restituisce solo testo, un **Agentic RAG** permette all'IA di interagire con il sistema sottostante. Il pilastro di questa architettura è il **Source Reference Pattern**: il sistema non restituisce solo un "pezzo di testo", ma un riferimento tecnico (`sourceRef`) che l'agente può usare per "scendere nel tecnico" (drill-down).

### I Tre Livelli
1.  **Semantic Layer (Qdrant)**: Ricerca per concetto e somiglianza tramite vettori a 768 dimensioni (Nomic/Ollama).
2.  **Logic Layer (AssistantService)**: Orchestrazione, validazione ibrida e normalizzazione dei dati.
3.  **Data Layer (MongoDB)**: La verità tecnica originale, accessibile tramite risoluzione deterministica.

---

## 2. Evoluzione e Roadmap (Fasi Completate)

### 🟢 Fase 1: Materializzazione e Decoupling
*   **Obiettivo**: Isolare l'IA dai dati operazionali per garantire stabilità.
*   **Azioni**: Creazione di `RagSyncService` e `RagSyncWorker`. La logica RAG è ora un'estensione asincrona che non appesantisce i servizi core.
*   **Batching**: Implementato un sistema di buffering (10 log o 30 secondi) per ottimizzare le chiamate verso Qdrant e Ollama.

### 🟢 Fase 2: Unificazione dei Contratti (Type-Driven DNA)
*   **Obiettivo**: Eliminare il "drift" dei tipi tra Backend e AI.
*   **Azioni**: 
    - Centralizzazione dei filtri in `service-params.types.ts`.
    - I parametri RAG (`LogSourceParams`, `AttackSourceParams`, etc.) derivano biologicamente dai Service tramite `Parameters<typeof Service.method>`.
*   **Vantaggio**: Se un filtro cambia nel backend, il compilatore TypeScript obbliga l'allineamento del RAG.

### 🟢 Fase 3: Payload DTO-Centrici e Versioning
*   **Obiettivo**: Arricchire la ricerca semantica con dati strutturati.
*   **Azioni**:
    - I payload salvati su Qdrant estendono i DTO ufficiali (es. `AttackSummaryPayload` extends `AttackDTO`).
    - Introdotto `RAG_SCHEMA_VERSION = 2` per tracciare l'evoluzione dei dati vettoriali.
*   **Vantaggio**: L'Agente riceve dati tecnici immediati (score, rps, geo) già nel primo hit di ricerca.

### 🟢 Fase 4: Hybrid Validation & Tooling
*   **Obiettivo**: Blindare la sicurezza e automatizzare l'integrazione agentica.
*   **Azioni**:
    - **Ponte QueryGuard**: Il `RagValidator` usa la whitelist di `QueryGuard` per sanitizzare ogni parametro recuperato da Qdrant.
    - **Auto-Discovery**: Creato l'endpoint `/api/assistant/tools` che espone lo schema JSON dinamico per i tool dell'Agente.

---

## 3. Componenti Chiave del Sistema

### 🛡️ RagValidator (Il Vigile Urbano)
Valida e sanitizza i `sourceRef`. È l'unico punto di contatto tra il mondo non strutturato dell'AI e il mondo rigoroso del Database. Previene injection e garantisce che i parametri di ricostruzione siano corretti.

### 🔗 AssistantService (L'Orchestratore)
Implementa il pattern **Pass-Through**:
```typescript
case 'attack':
    // Grazie alla tipizzazione forte, passiamo il pacchetto 'as is'
    return await this.threatLogService.getAttackDetail(params);
```
Questo rende il servizio "immortale": non deve essere modificato quando vengono aggiunti nuovi filtri ai service sottostanti.

### 🌐 RagTranslationService (Il Narratore)
Trasforma JSON complessi in narrazioni deterministiche i18n utilizzando i `RagTemplates`. Supporta la generazione opzionale di riassunti analitici tramite Ollama per le campagne aggregate.

---

## 4. Manutenzione e Integrità

### Controllo dello Schema
Il sistema monitora la coerenza tra il codice e i dati persistiti su Qdrant.
- **Endpoint**: `POST /api/assistant/integrity-check`
- **Funzionamento**: Scansiona la collection e identifica i punti con `schemaVersion` obsoleta, segnalando la necessità di un re-indexing.

### Degraded Mode
Se Ollama o Qdrant sono offline, il backend continua a funzionare regolarmente. Il sistema RAG segnala lo stato di "Non Operativo" senza bloccare la pipeline di acquisizione dei log.

---

## 5. Flusso Operativo per Agenti Esterni (es. ChainPrompt)

Per integrare un nuovo Agente tematico:

1.  **Discovery**: L'agente interroga `GET /api/assistant/tools` per ottenere la definizione aggiornata dei tool.
2.  **Search**: L'utente chiede: *"Cosa è successo all'IP 1.2.3.4?"*. L'agente chiama `/api/assistant/search`.
3.  **Reasoning**: L'agente riceve il `text` (riassunto) e il payload DTO arricchito.
4.  **Drill-down**: Se l'agente decide di approfondire, usa il tool `resolve_threat_source` passando il `sourceRef`.
5.  **Technical Truth**: L'Agente riceve il JSON tecnico originale da MongoDB e conclude l'investigazione.

---
*Documento aggiornato con le evoluzioni della Fase 1-2-3 (Maggio 2026)*
