# Agentic RAG Integration Guide: Threat Intelligence Pipeline

Questa guida documenta l'architettura, i passaggi di sviluppo e le best practice implementate per integrare un flusso RAG (Retrieval-Augmented Generation) di classe enterprise nel progetto ThreatIntel. L'obiettivo è rendere i dati forensi fruibili in modo trasparente sia da un frontend classico che da un Agente AI.

---

## 1. Visione Architetturale: Agentic RAG

A differenza di un RAG tradizionale che restituisce solo testo, un **Agentic RAG** permette all'IA di interagire con il sistema sottostante. Il pilastro di questa architettura è il **Source Reference Pattern**: il sistema non restituisce solo un "pezzo di testo", ma un riferimento tecnico (`sourceRef`) che l'agente può usare per "scendere nel tecnico" (drill-down).

### I Tre Livelli
1.  **Semantic Layer (Qdrant)**: Ricerca per concetto e somiglianza.
2.  **Logic Layer (AssistantService)**: Orchestrazione, validazione e normalizzazione.
3.  **Data Layer (MongoDB)**: La verità tecnica originale, accessibile tramite risoluzione.

---

## 2. Roadmap di Sviluppo

### Fase 1: Materializzazione e Decoupling
*   **Obiettivo**: Separare l'IA dai dati operazionali.
*   **Azioni**: Creazione di `RagSyncService` e `RagSyncWorker`. Rimozione di ogni dipendenza IA (`Ollama`, `Translation`) dai servizi core (`ThreatLogService`, `CampaignService`).
*   **Risultato**: I servizi operazionali rimangono snelli e stabili; la logica RAG è isolata.

### Fase 2: Contratti e Tipizzazione Forte
*   **Obiettivo**: Definire il linguaggio comune tra Uomo, Macchina e Agente.
*   **Azioni**: Formalizzazione dei payload (`ThreatLogPayload`, `AttackSummaryPayload`, etc.) e delle unioni discriminate per i `sourceRef`.
*   **Best Practice**: Mai usare `any`. Ogni dato nel RAG deve avere un contratto tipizzato.

### Fase 3: Assistant Service (Business Control)
*   **Obiettivo**: Centralizzare la business logic della ricerca e della generazione.
*   **Azioni**: Implementazione dei metodi `search()`, `ask()` e `resolveSource()`.
*   **Logica di Ricerca**: Segue la catena **Valida -> Recupera -> Filtra -> Normalizza**.

### Fase 4: Validazione a Runtime e Tooling
*   **Obiettivo**: Rendere l'Agente sicuro e deterministico.
*   **Azioni**: Creazione di `RagValidator` per validare le richieste e generare gli schemi JSON per i Tool dell'agente.

---

## 3. Best Practice per l'Integrazione

### 🛡️ Resilienza e Degraded Mode
Il sistema RAG deve essere considerato un "optional di lusso". Se Ollama o Qdrant non sono raggiungibili (es. Error 404/500), il sistema deve entrare in **Degraded Mode**:
- I servizi core continuano a funzionare.
- I log di sistema segnalano il problema come `warning`, non come `critical` (bloccante).

### 🔗 Source Reference Pattern (ID Dinamici)
Evitare l'uso di ID MongoDB statici nei payload RAG per entità derivate (come gli Attacchi).
- **Perché**: Gli attacchi sono aggregazioni temporali.
- **Soluzione**: Usare parametri di ricostruzione nel `sourceRef` (`ip`, `timeConfig`, `minLogs`). Questo garantisce che l'Agente possa sempre ricostruire la verità tecnica anche se i dati sono stati ricalcolati.

### 🌐 Coerenza i18n
Ogni modifica alle stringhe deve essere riflessa in tutti i file locale (`it-IT`, `en-US`, `de-DE`, etc.). L'Agente potrebbe operare in lingue diverse o aver bisogno di messaggi di errore localizzati per l'utente finale.

### 🧪 Atomic Builds e Test
Validare ogni strato (Backend -> Controller -> UI) immediatamente dopo ogni modifica. I test unitari devono coprire i casi di "sistema non operativo" per garantire che il fallback funzioni.

---

## 4. Flusso Operativo dell'Agente AI

L'integrazione con un Agente AI (es. via LangChain o OpenAI Tools) segue questo schema:

1.  **Ricerca Semantica**: L'agente chiama `/api/assistant/search` con una query naturale.
2.  **Analisi Hit**: L'agente riceve una lista di `RagSearchHit`. Ogni hit contiene un campo `text` (riassunto leggibile) e un `sourceRef`.
3.  **Decisione Forense**: Se l'agente ha bisogno di dati tecnici (es. "mostrami tutti i log di questo attacco"), invoca il tool `resolve_threat_source` passando il `sourceRef`.
4.  **Risoluzione**: L' `AssistantService` riceve il riferimento, valida i parametri tramite `RagValidator` e interroga il servizio operazionale appropriato per restituire il dato JSON grezzo.

---

## 5. Evoluzioni Future (Roadmap 2.0)

- **Hybrid Search**: Combinare la ricerca vettoriale con la ricerca full-text di MongoDB per una precisione estrema su ID e IP.
- **Feedback Loop**: Permettere agli analisti di marcare i SearchHit come "Utili" o "Non Utili" per fare fine-tuning degli embedding.
- **Multi-Vector Support**: Gestire embedding diversi per diverse lingue nello stesso punto di ingresso.

---
*Documento generato da Antigravity Core - 2026*
