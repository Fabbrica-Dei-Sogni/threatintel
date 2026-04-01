# Roadmap: Formalizzazione Entità Dossier su MongoDB

L'obiettivo è trasformare il sistema attuale di "Dossier Recorder" (basato su Pinia/Store volatile) in un'entità persistente su MongoDB. Questo permetterà di salvare le investigazioni, ricercarle e visualizzarle in futuro come report consolidati.

## Architettura Proposta

### 1. Schema MongoDB (DossierSchema)
L'entità deve essere in grado di ospitare dati eterogenei provenienti da diverse parti del sistema (IP, Attacchi, Timeline Cowrie, Note manuali).

**Campi principali:**
- `title`: Titolo del dossier (es. "Analisi Incidente IP 45.x.x.x").
- `description`: Note di contesto dell'analista.
- `owner`: Riferimento all'utente creatore.
- `status`: `draft` | `finalized` | `archived`.
- `tags`: Array di stringhe per categorizzazione (es. "BruteForce", "Critical").
- `sections`: Array di oggetti `Section`:
    - `type`: Tipo di dato (es. 'ip', 'attack', 'telnet', 'custom_text').
    - `templateKey`: Chiave i18n per la rigenerazione.
    - `data`: Oggetto Mixed (Payload dei dati).
    - `renderedText`: Fallback testuale (snapshot al momento del salvataggio).
    - `order`: Numero di sequenza.
    - `timestamp`: Momento dell'acquisizione.

### 2. Service Layer (DossierService)
Un nuovo servizio nel backend (`core/services/DossierService.ts`) gestirà la logica di business:
- Validazione dei payload delle sezioni.
- Salvataggio atomico del dossier.
- Ricerca avanzata (per IP contenuti nelle sezioni, per tag, per data).

---

## Roadmap "Easy" (Fasi del Progetto)

### Fase 1: Fondamenta & DTO
- [ ] Creazione di `DossierSchema.ts` in `core/models`.
- [ ] Definizione delle interfacce TypeScript (`DossierDTO`).
- [ ] Registrazione nel container di Dependency Injection.

### Fase 2: Persistence API
- [ ] Implementazione di `DossierController.ts`.
- [ ] Endpoint `POST /api/dossiers`: Riceve lo stato attuale del recorder e lo rende persistente.
- [ ] Endpoint `GET /api/dossiers`: Restituisce la lista (paginata) delle investigazioni.

### Fase 3: Store Sync (Recording)
- [ ] Aggiornamento di `dossierStore.ts` (Frontend).
- [ ] Aggiunta metodo `persistActiveDossier()` nello store.
- [ ] Integrazione pulsante "Salva in Database" nell'HUD del Recorder.

### Fase 4: Management UI
- [ ] Nuova vista `/dossiers` nel Dashboard.
- [ ] Tabella interattiva con anteprime delle sezioni.
- [ ] Funzione di export PDF partendo da un'entità DB.

---

*Documento creato il 01/04/2026 come riferimento per l'implementazione futura.*
