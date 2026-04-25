# Roadmap: Advanced Threat Campaign Wave Analysis (Clustering Temporale)

## Obiettivo dell'Iniziativa
Evolvere l'analisi forense delle campagne (identificate tramite Fingerprint Hash) per passare da una visione "monolitica" (un unico blocco di log dall'inizio alla fine della campagna) a una visione "dinamica a ondate" (Wave Analysis). 

L'obiettivo è rivelare le dinamiche temporali degli attacchi (es. scansione iniziale, periodo di latenza, attacco mirato successivo) raggruppando i log ravvicinati all'interno di una stessa campagna e separandoli quando si verifica un "silenzio" significativo (Time Gap).

## Contesto Tecnico e Architetturale
Attualmente, `CampaignService.getCampaignDetail` estrae tutti i log associati a uno specifico hash e fornisce statistiche globali aggregate. Se una campagna dura 3 mesi e coinvolge 50 IP diversi in momenti separati, i dati vengono "schiacciati" insieme.

La nuova implementazione interverrà a livello di MongoDB sfruttando la **Window Operator Pipeline** (`$setWindowFields`), applicandola esclusivamente ai log pre-filtrati per un singolo hash. Questo garantisce prestazioni chirurgiche ed evita sovraccarichi globali sul database.

## Fasi di Sviluppo (Da eseguire)

### Fase 1: Estensione del Servizio Backend
- **Target:** `core/services/CampaignService.ts` e `core/services/forense/ForensicPipelineService.ts`
- **Azione:** Creare un nuovo metodo `getCampaignWaves(hash: string, gapThresholdMs: number)` (o integrare un flag nel metodo esistente `getCampaignDetail`).
- **Implementazione Pipeline MongoDB:**
  1. `$match`: Filtrare i log per l'hash specifico della campagna (pre-filtraggio veloce).
  2. `$sort`: Ordinare i log rigorosamente per `timestamp` (dal più vecchio al più recente).
  3. `$setWindowFields`: Calcolare il delta temporale (`timeGap`) tra il log corrente e quello precedente.
  4. `$addFields`: Generare un flag booleano (es. `isNewWave = timeGap > SOGLIA_SILENZIO`).
  5. `$setWindowFields` (Cumulativo): Sommare i flag `isNewWave` per generare un ID incrementale per l'ondata (es. `waveId: 1, 2, 3...`).
  6. `$group`: Raggruppare i log in base a `waveId`, calcolando per ogni ondata: Data Inizio, Data Fine, Numero Log, Set di IP sorgenti.

### Fase 2: Definizione Soglie di Silenzio Configurabili
- **Azione:** Stabilire un valore di default sensato per il `gapThresholdMs` (es. 12 ore, 24 ore o 7 giorni).
- **Integrazione:** Permettere all'utente o all'analista (tramite parametro API) di regolare questa soglia per scoprire micro-ondate (gap di minuti) o macro-ondate (gap di mesi).

### Fase 3: Esposizione API REST
- **Target:** `core/apis/campaignroutes.ts` e `core/controllers/CampaignController.ts`
- **Azione:** Esporre l'endpoint (es. `GET /api/campaign/:hash/waves`) per permettere al client di consumare i dati suddivisi per ondate.

### Fase 4: Aggiornamento Test Suite
- **Target:** `core/__tests__/CampaignService.test.ts`
- **Azione:** Scrivere test d'integrazione con finti log intervallati da lunghi periodi di silenzio per verificare che l'algoritmo di "Wave Id" li separi correttamente e restituisca il numero atteso di ondate.

## Benefici Attesi (Valore per la Threat Intelligence)
- **Identificazione Botnet a Rotazione:** Scoprire se una campagna riprende vigore dopo settimane cambiando gli IP sorgenti.
- **Isolamento Comportamentale:** Separare la fase di "Discovery" automatizzata dalla fase di "Exploitation" mirata.
- **Riduzione del Rumore:** Analizzare blocchi di log omogenei (es. solo i log del weekend scorso) invece di statistiche "diluite" su anni di attività pregressa.

---
*Roadmap creata durante la sessione tecnica notturna del 24-25 Aprile 2026. Pronta per lo sviluppo.*