# Configurazione Honeypot via Dashboard

Questa documentazione descrive l'implementazione e l'utilizzo della pagina di gestione configurazioni dell'honeypot dalla dashboard.

## Panoramica

La pagina di configurazione permette di gestire le impostazioni dell'honeypot direttamente dalla dashboard web, senza dover modificare manualmente il database. È accessibile dalla **Home page** tramite il pulsante hamburger (☰) posizionato in alto a sinistra.

## Architettura

### Backend (API)

Le API sono esposte tramite `configroutes.ts` e utilizzano `ConfigService.ts` per l'accesso al database MongoDB.

**Endpoint disponibili:**

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/config` | Recupera tutte le configurazioni |
| POST | `/config` | Crea o aggiorna una configurazione |
| DELETE | `/config/:key` | Elimina una configurazione per chiave |
| POST | `/config/search` | Cerca configurazioni per chiave o valore |

**Schema dati:**
```typescript
interface ConfigItem {
    _id?: string;
    key: string;      // Chiave univoca (es. SUSPICIOUS_PATTERNS)
    value: string;    // Valore (può essere lista comma-separated o testo)
    __v?: number;
}
```

### Frontend

#### Struttura file

```
frontend/dashboard/src/
├── api/
│   └── config.ts                    # Client API per configurazioni
├── composable/
│   └── useConfig.ts                 # Composable per stato reattivo
├── components/
│   ├── ConfigMenuButton.vue         # Pulsante accesso configurazione
│   └── ConfigEditor.vue             # Editor configurazione riutilizzabile
└── views/
    └── configpage/
        ├── ConfigPage.vue           # Pagina principale
        └── ConfigPage.css           # Stili
```

#### Componenti

**ConfigMenuButton.vue**
- Pulsante stile hamburger (☰) posizionato in alto a sinistra (fixed)
- Visibile solo nella Home page
- Click → naviga a `/config`

**ConfigEditor.vue**
- Componente riutilizzabile per visualizzare e modificare una singola configurazione
- Rileva automaticamente il tipo di valore:
  - **Lista**: valori separati da virgola → visualizzati come tag chip
  - **Chiave-Valore**: formato `KEY:VALUE,KEY2:VALUE2` → tabella modificabile
  - **Testo**: qualsiasi altro formato → textarea

**ConfigPage.vue**
- Pagina principale con lista configurazioni
- Barra di ricerca per filtrare
- Pulsante per creare nuove configurazioni
- Integra ConfigEditor per ogni configurazione

#### Composable: useConfig

Fornisce stato reattivo e operazioni CRUD:

```typescript
const {
    configs,           // Array di configurazioni
    filteredConfigs,   // Configurazioni filtrate per ricerca
    loading,           // Stato caricamento
    saving,            // Stato salvataggio
    error,             // Messaggio errore
    searchQuery,       // Query di ricerca
    loadConfigs,       // Carica tutte le configurazioni
    upsertConfig,      // Crea/aggiorna configurazione
    removeConfig,      // Elimina configurazione
    search,            // Ricerca sul backend
    getValueType,      // Determina tipo valore (list/keyvalue/text)
    valueToTags,       // Converte stringa → array tag
    tagsToValue        // Converte array tag → stringa
} = useConfig();
```

## Tipi di Configurazione Supportati

### 1. Lista (comma-separated)

Configurazioni con valori multipli separati da virgola.

**Esempio:**
```
key: SUSPICIOUS_PATTERNS
value: config.json.*,.*server.*,.*status.*,geoip,editor
```

**UI:** Visualizzati come tag chip con possibilità di aggiungere/rimuovere singoli elementi.

### 2. Chiave-Valore

Configurazioni con coppie chiave:valore separate da virgola.

**Esempio:**
```
key: SUSPICIOUS_SCORES
value: SUSPICIOUS_COOKIES:5,ALT_PORT:5,URL_PATTERN:12
```

**UI:** Tabella con colonne Chiave e Valore, modificabili inline.

### 3. Testo semplice

Qualsiasi altro formato di valore.

**UI:** Textarea per editing libero.

## Utilizzo

### Accedere alla Configurazione

1. Vai alla **Home page** della dashboard
2. Clicca sul pulsante **hamburger (☰)** in alto a sinistra
3. Si apre la pagina **Configurazione Honeypot**

### Visualizzare le Configurazioni

- Le configurazioni sono mostrate come cards espandibili
- Ogni card mostra:
  - **Chiave** (es. `SUSPICIOUS_PATTERNS`)
  - **Tipo** (Lista, Chiave-Valore, Testo)
  - **Preview** dei primi valori
- Clicca sulla card per espandere e vedere tutti i valori

### Modificare una Configurazione

1. Clicca sull'**icona matita** (✏️) sulla card
2. Si apre l'editor modale
3. Per **Liste**: 
   - Rimuovi tag cliccando sulla ×
   - Aggiungi tag digitando nel campo e premendo + o Enter
4. Per **Chiave-Valore**:
   - Modifica chiavi e valori direttamente
   - Rimuovi coppie con ×
   - Aggiungi nuove coppie con i campi in basso
5. Per **Testo**: modifica liberamente nella textarea
6. Clicca **Salva** per confermare

### Creare una Nuova Configurazione

1. Clicca **Nuova Configurazione** in alto
2. Inserisci:
   - **Chiave**: solo MAIUSCOLE, numeri e underscore (es. `MY_NEW_PATTERN`)
   - **Valore**: valori separati da virgola o testo libero
3. Clicca **Salva**

### Eliminare una Configurazione

1. Clicca sull'**icona cestino** (🗑) sulla card
2. Conferma l'eliminazione nel dialog

### Cercare Configurazioni

- Usa la **barra di ricerca** in alto
- Cerca per chiave o valore
- I risultati si aggiornano in tempo reale

## Internazionalizzazione

La pagina è completamente internazionalizzata con supporto per:
- 🇮🇹 Italiano (it-IT)
- 🇬🇧 English (en-US)
- 🇩🇪 Deutsch (de-DE)
- 🇫🇷 Français (fr-FR)
- 🇵🇱 Polski (pl-PL)
- 🇷🇺 Русский (ru-RU)

Le chiavi i18n sono definite nelle sezioni `nav` e `config` dei file locale.

## Note Tecniche

### Routing

La route `/config` è definita in `router/index.ts`:
```typescript
{ path: '/config', name: 'Config', component: ConfigPage }
```

### API Base URL

Le chiamate API usano lo stesso base URL configurato nel profilo attivo (vedi Settings → API URL).

### Dipendenze

- Vue 3 Composition API
- Vue Router
- Vue I18n
- Axios (HTTP client)
- Pinia (state management per profili)
