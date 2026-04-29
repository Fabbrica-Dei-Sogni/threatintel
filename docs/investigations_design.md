# Design Document: Entità "Investigation" (Investigazione Forense)

## 1. Visione d'insieme
Attualmente il sistema opera su un modello **"On-the-fly"**: attacchi, campagne e correlazioni vengono calcolati dinamicamente tramite pipeline di aggregazione sui log grezzi. 
L'entità **Investigation** introduce un livello di **Persistenza Forense**, permettendo di "congelare" un'analisi dinamica in un oggetto strutturato nel database.

### Obiettivo
Passare dal monitoraggio reattivo (Vedere l'attacco) al case management proattivo (Gestire l'incidente).

---

## 2. Lo Schema Dati (Backend)
L'investigazione non è un log, ma un "contenitore di intelligenza". 

### Proposta di Schema (Mongoose/MongoDB)
```typescript
{
  title: String,             // Titolo dell'investigazione (es. "Botnet coordinata X")
  hash: { type: String, unique: true }, // Hash univoco dell'investigazione
  status: { 
    type: String, 
    enum: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'FALSE_POSITIVE'],
    default: 'OPEN' 
  },
  severity: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM' 
  },
  
  // Snapshot dei dati al momento della creazione
  snapshot: {
    campaignHash: String,     // Riferimento alla campagna originale
    firstSeen: Date,
    lastSeen: Date,
    involvedIps: [String],    // Lista IP "congelata"
    totalLogsAtCreation: Number
  },

  // Dati strutturati estratti dall'Hub di Correlazione
  coordinationWindows: [{
    start: Date,
    end: Date,
    ips: [String],
    confidence: Number        // Punteggio di affidabilità della coordinazione
  }],

  // Arricchimenti (opzionali, da calcolare dopo la promozione)
  intelligence: {
    mitreTechniques: [String], // es. T1110
    commonPayloads: [String],  // Esempi di comandi comuni rilevati
    ja3Fingerprints: [String]  // Firme TLS comuni
  },

  analystNotes: [{
    author: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],

  tags: [String]
}
```

---

## 3. Flusso Software: Passo dopo Passo

### Fase A: Backend (La Fondazione)
1.  **Creazione Schema**: Implementare il modello `Investigation` in `core/models/Investigation.ts`.
2.  **Controller di "Promozione"**: Creare un endpoint `POST /investigations/promote`.
    *   Questo endpoint riceve un `campaignHash` e i parametri attuali (minScore, etc.).
    *   Esegue la stessa pipeline di aggregazione che usi oggi per mostrare la campagna.
    *   Invece di mandare i dati al frontend, li scrive nel nuovo schema `Investigation`.
3.  **Cross-Correlation Service**: Creare una funzione che, all'arrivo di nuovi log, controlla se l'IP è presente in un'investigazione con status `OPEN`. Se sì, genera un alert prioritario.

### Fase B: Frontend (L'Esperienza Utente)
1.  **Pulsante di Azione**: In `CampaignDetail.vue`, aggiungere un tasto **"PROMUOVI A INVESTIGAZIONE"**.
    *   Al click, invia la richiesta al backend.
2.  **Investigation Dashboard**: Una nuova vista (es. `/investigations`) che elenca tutti i casi aperti, la loro gravità e lo status.
3.  **Investigation Detail View**: Una pagina dedicata (stile "Fascicolo Carabinieri") dove:
    *   Vedi i dati congelati (anche se i log originali sono stati cancellati).
    *   Puoi aggiungere note e tag.
    *   Puoi esportare un **Report Forense PDF** basato sui dati strutturati.

---

## 4. Differenza con il "Dossier"
Mentre il **Dossier** è un raccoglitore manuale di note e testi (per l'analista), l'**Investigazione** è un database di oggetti vivi (per il software).
*   Il Dossier dice: *"Penso che questi siano cattivi"*.
*   L'Investigazione dice: *"Il sistema ha codificato che questi 5 IP sono correlati e li monitorerà per sempre"*.

**Evoluzione Consigliata**: Fare in modo che un Dossier possa "importare" o "puntare" a un'Investigazione, combinando il potere del testo libero con la precisione dei dati strutturati.

---

## 5. Prossimi Passaggi
Quando deciderai di procedere, inizieremo definendo il primo modello Mongoose e creando la prima "promozione" di una campagna esistente.
