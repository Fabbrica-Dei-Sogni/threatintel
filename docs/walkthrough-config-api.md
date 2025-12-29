# 🛠️ Walkthrough: Configuration API Implementation

**Data**: 2025-12-29  
**Stato**: ✅ Completato  
**Feature**: Esposizione REST API per l'entità `Configuration` (MongoDB)

## Obiettivo
Permettere alla dashboard UI di interagire con le configurazioni di sistema salvate su MongoDB, gestendo operazioni di lettura, creazione, aggiornamento, eliminazione e ricerca.

## Modifiche Tecniche

### 1. Backend Core: ConfigService
Il servizio `ConfigService.ts` è stato esteso e migrato completamente a TypeScript con supporto per Dependency Injection (`tsyringe`).

**Nuovi Metodi:**
- `deleteConfig(key: string)`: Elimina una configurazione tramite chiave univoca.
- `searchConfigs(query: string)`: Ricerca case-insensitive nelle chiavi e nei valori utilizzando regex.

### 2. Nuove Rotte: configroutes
Implementato il file [configroutes.ts](file:///home/amodica/workspaces/threatintel/core/apis/configroutes.ts) che espone i seguenti endpoint:

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/config` | Recupera tutte le configurazioni esistenti |
| `POST` | `/api/config` | Crea o aggiorna (upsert) una configurazione |
| `DELETE` | `/api/config/:key` | Rimuove una configurazione tramite chiave |
| `POST` | `/api/config/search` | Esegue una ricerca full-text su key e value |

### 3. Registrazione Router
Le rotte sono state registrate nel router principale in [endpoint.ts](file:///home/amodica/workspaces/threatintel/core/endpoint.ts), iniettando l'istanza di `ConfigService` risolta dal container DI.

## Validazione e Test

### Test di Integrazione
È stato creato un nuovo set di test in [configroutes.test.ts](file:///home/amodica/workspaces/threatintel/core/apis/__tests__/configroutes.test.ts) che copre tutti gli scenari:
- Successo nel recupero totale.
- Upsert corretto (create/update).
- Gestione errori 400 (parametri mancanti).
- Gestione 404 su eliminazione di chiavi inesistenti.
- Ricerca con e senza query.

**Risultato Test:**
```text
 PASS  core/apis/__tests__/configroutes.test.ts
  ConfigRoutes API
    GET /api/config
      ✓ should return all configs
    POST /api/config
      ✓ should create a new config
      ✓ should return 400 if key is missing
    DELETE /api/config/:key
      ✓ should delete a config
      ✓ should return 404 if config doesn't exist
    POST /api/config/search
      ✓ should search configs
      ✓ should return all if query is empty
```

### Build & Runtime
- ✅ `npm run build`: Compilazione TypeScript completata senza errori.
- ✅ `npm start`: Il server si avvia regolarmente e le rotte sono operative.

## Prossimi Passi
- Integrare la gestione delle configurazioni nella Dashboard UI (Frontend).
- Aggiungere middleware di autenticazione alle rotte di configurazione.
