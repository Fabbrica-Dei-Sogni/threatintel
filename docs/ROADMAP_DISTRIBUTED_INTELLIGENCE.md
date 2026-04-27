# Roadmap: Distributed Forensic Intelligence (Campagne & Cluster)

Questo documento traccia l'evoluzione del sistema di analisi distribuita, partendo dalla scoperta dei pattern comuni fino alla generazione di dossier investigativi avanzati.

## 🟢 Stato Attuale (Consolidato)

### 1. Discovery Distribuita (Hash-Based)
- Implementazione della pipeline forense basata su `fingerprint.hash`.
- Capacità di aggregare log da molteplici IP sorgenti coordinati.
- Calcolo automatico di RPS, Intensità e Danger Score del cluster.

### 2. Architettura Frontend (Orchestratori)
- **Refactoring Modulare**: Separazione della visualizzazione tra Anomalie Atomiche (singolo IP) e Anomalie Distribuite (Cluster).
- **AttackDetail Orchestrator**: Implementazione di una "Smart View" che seleziona dinamicamente tra `StandardAttackView` e `DistributedAttackView`.
- **CampaignDetail Refactoring**: Centralizzazione della logica di business in composables (`useCampaignDetail.ts`) e gestione tattica della selezione IP tramite Pinia.

### 3. Tactical IP Selector (🎯)
- Integrazione di un sistema di selezione mirata (mirino) per estrarre sotto-cluster da una campagna generale.
- Persistenza dello stato di selezione tra le sessioni di navigazione.

---

## 🟡 Prossimi Passi (Roadmap Futura)

### Fase 1: Consolidamento Reportistica Atomica
- **Obiettivo**: Stabilizzare la generazione di report PDF/HTML per singoli attacchi.
- **Azione**: Verificare la coerenza dei template con i dati estratti dalla nuova architettura a componenti.

### Fase 2: Campaign Report Engine (New from Scratch)
- **Obiettivo**: Creare un sistema di generazione report dedicato esclusivamente alle campagne distribuite.
- **Caratteristiche peculiari**:
    - Mappatura geografica globale del cluster.
    - Timeline correlata degli eventi (chi ha colpito quando).
    - Analisi dell'impatto coordinato vs difesa (Rate Limit Events aggregati).

### Fase 3: Advanced Investigative Dossier Capture
- **Obiettivo**: Evolvere il Dossier Entity per supportare sezioni "peculiari" delle campagne.
- **Azione**: Implementare tool di cattura per:
    - Grafici di correlazione tra IP.
    - Analisi delle tecniche di attacco dominanti nel cluster.
    - Note investigative specifiche per il gruppo di minaccia (Threat Group).

### Fase 4: Wave Analysis Integration
- **Obiettivo**: Integrare la "Wave Analysis" (clustering temporale) nel dettaglio campagna per identificare ondate successive di attacco.
- **Riferimento**: Vedere `ROADMAP_WAVE_ANALYSIS.md`.

---

## 📜 Note di Sviluppo
*Le modifiche apportate nell'Aprile 2026 hanno introdotto la totale indipendenza logica tra analisi atomica e distribuita, ponendo le basi per una reportistica altamente specializzata.*

---
*Roadmap aggiornata il 27 Aprile 2026.*
