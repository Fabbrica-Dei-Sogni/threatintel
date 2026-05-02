# Proposta Architetturale: Integrazione RAG per Threat Intelligence

## Obiettivo
Progettare l'integrazione di un sistema RAG (Retrieval-Augmented Generation) all'interno della piattaforma `threatintel`. L'obiettivo è permettere a un Agente AI di interrogare semanticamente la base di conoscenza delle minacce, mantenendo le performance e l'architettura delle API REST inalterate.

## Perimetro di Integrazione (Scope)
- **Incluso:** `ThreatLog` (dati atomici), `IpDetails`, `AbuseReport` e le entità virtuali `Attacchi` e `Campagne` (generate dinamicamente dalle pipeline forensi).
- **Escluso:** Dati provenienti da `Cowrie` (honeypot) in questa prima fase.

## La Sfida: Dati Dinamici vs Ricerca Semantica
I sistemi RAG necessitano di dati testuali e vettoriali pre-esistenti (persistiti) per effettuare le ricerche di similarità. 
Nella nostra architettura attuale:
1. **Entità Persistite:** `ThreatLog`, `IpDetails` e `AbuseReport` esistono fisicamente su MongoDB.
2. **Entità Virtuali:** Le `Campagne` e gli `Attacchi` non sono salvati fisicamente; vengono calcolati on-the-fly tramite l'Aggregation Pipeline di MongoDB (es. all'interno di `CampaignService`).

Per interrogare semanticamente entità complesse come le "Campagne", queste devono essere "materializzate" in un database vettoriale sotto forma di snapshot narrativi.

## Architettura a Doppio Flusso (Dual-Track Materialization)

Per mantenere le entità di core agnostiche e non appesantirle, creiamo una collection o un database separato dedicato unicamente al RAG (es. collection `RagVectors` se si usa MongoDB Atlas Vector Search, oppure un database esterno come Qdrant o Chroma). Il popolamento di questo indice avviene tramite due flussi distinti:

### Flusso 1: Sincronizzazione Real-Time (Per Dati Persistiti)
Gestisce la base atomica: `ThreatLog`, `IpDetails`, e `AbuseReport`.
- **Trigger:** Event-driven. Quando viene inserito un nuovo log rilevante (si consiglia di filtrare in base a un `threatScore` minimo per evitare rumore) o un `IpDetails` viene popolato, si scatena un evento (tramite Mongoose Hooks o MongoDB Change Streams).
- **Normalizzazione (Traduzione Narrativa):** Un Worker dedicato riceve il JSON e lo traduce in un paragrafo discorsivo.
  - *Esempio:* `"L'IP 1.2.3.4 ha un punteggio di abuso di 80 per attività di port scanning. Ha generato un ThreatLog attaccando la porta 22 con payload malevolo."`
- **Vettorializzazione & Upsert:** Il testo narrativo viene passato a un modello di embedding (es. OpenAI text-embedding-3) e salvato nella collection vettoriale insieme a un riferimento forte (`sourceId` e `sourceCollection`) al record originale.

### Flusso 2: Sincronizzazione Schedulata (Per Dati Virtuali)
Gestisce la visione d'insieme: `Campagne` e `Attacchi`.
- **Trigger:** Time-driven (Cron Job). Ad intervalli regolari (es. ogni 15-30 minuti), si attiva un processo in background.
- **Esecuzione Pipeline:** Il Worker invoca la *Forensic Pipeline* esistente (passando per `CampaignService`) per farsi restituire le Campagne e gli Attacchi correntemente attivi.
- **Snapshot Narrativo:** I risultati aggregati (JSON complessi) vengono convertiti in riassunti testuali che fotografano lo stato dell'entità virtuale nel momento esatto dell'esecuzione.
  - *Esempio:* `"Campagna distribuita in corso: 50 IP unici dalla Russia stanno conducendo attacchi SSH bruteforce focalizzati. Il livello di minaccia medio della campagna è Critico e coinvolge 1500 log totali."*
- **Vettorializzazione & Upsert:** Questi "Snapshot" testuali vettorializzati vengono inseriti o aggiornati nell'indice RAG, sovrascrivendo gli snapshot vecchi della stessa campagna o mantenendo uno storico a fini analitici.

## Flusso di Interrogazione dell'Agente AI (Tooling)

L'Agente AI non deve interrogare mai i database in SQL o Mongoose diretti come prima opzione, ma viene equipaggiato con due Tool specifici:

1. **Tool Principale: `search_semantic_knowledge(query, filters)`**
   - L'agente formula una query in base alla richiesta dell'utente (es. *"Quali sono le campagne recenti che usano payload JNDI?"*).
   - Il tool vettorializza la query, effettua una ricerca di similarità nell'indice RAG (utilizzando eventuali `metadata` per pre-filtrare).
   - Restituisce all'agente i frammenti narrativi pertinenti e i rispettivi `sourceId`. L'agente usa queste informazioni semantiche per rispondere.

2. **Tool Secondario: `get_raw_forensic_data(sourceId, entityType)`**
   - Se, a seguito della ricerca semantica, l'agente comprende di dover analizzare il dato strutturato esatto (es. per contare valori specifici, leggere gli header HTTP originali, etc.), usa questo tool.
   - Il tool riceve l'ID ed esegue una chiamata REST standard (o chiama il service layer) per recuperare il JSON originale agnostico, garantendo un'analisi forense perfetta.

## Roadmap di Sviluppo Suggerita

1. **Setup Infrastruttura Vettoriale:** Scegliere e preparare l'ambiente (abilitare Atlas Vector Search sulla collection oppure istanziare un container Qdrant/Milvus locale).
2. **Sviluppo Modulo Traduttori (ETL Semantico):** Creare le funzioni TypeScript che prendono in input i tipi `IThreatLog`, `IIpDetails`, e `ICampaign` (output dell'aggregazione) e restituiscono le stringhe narrative formattate.
3. **Implementazione Worker Event-Driven:** Costruire il listener (Change Stream) per i ThreatLog e l'integrazione asincrona con l'API di Embedding per popolare il DB Vettoriale.
4. **Implementazione Worker Cron:** Sviluppare il job schedulato in Node.js che esegue l'aggregazione di Campaign/Attacks e aggiorna gli snapshot semantici.
5. **Creazione Tool per l'Agente AI:** Scrivere i wrapper/tools che permetteranno all'LLM (tramite LangChain, LlamaIndex o chiamate dirette) di invocare le ricerche vettoriali integrate nel sistema RAG.
