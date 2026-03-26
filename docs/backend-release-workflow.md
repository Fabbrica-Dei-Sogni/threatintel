# ThreatIntel Backend: Workflow di Release (Hybrid Bundle)

Questo documento descrive l'architettura e le procedure operative per la generazione di artefatti distribuibili del backend di ThreatIntel.

## 🎯 Obiettivi
L'obiettivo del workflow di release è separare il codice sorgente dall'esecuzione in produzione, garantendo:
1.  **Portabilità**: Esecuzione senza dipendere dalla cartella `node_modules` originale (spesso pesante e piena di dev-dependencies).
2.  **Sicurezza**: Distribuzione di codice compilato e minificato (bundle), proteggendo la logica sorgente.
3.  **Zero-Impact**: Mantenimento dell'attuale ambiente di sviluppo basato su `ts-node` senza alcuna modifica strutturale.

---

## 🏗️ Architettura dell'Artefatto (Modello Ibrido)

A causa della natura di alcune dipendenze (come `geoip-lite`) che richiedono database binari esterni, l'artefatto non è un singolo file fisico ma un **pacchetto auto-contenuto** così strutturato:

```text
release/
├── index.js             # Bundle unico (codice + dipendenze JS)
├── data/                # Database binari (.dat) per GeoIP
├── infra/               # Script di maintenance (Redis/MongoDB)
├── install.sh           # Installer automatizzato per Linux
└── threatintel.service  # Template per il servizio systemd
```

### Tecnologie Utilizzate
- **Bundler**: `@vercel/ncc` (Node.js Compiler) per fondere il codice TypeScript e i moduli npm in un unico file CommonJS.
- **Runtime**: Node.js nativo (senza necessità di `ts-node` o `typescript` sul server di produzione).

---

## 🏗️ Ciclo di Vita della Release

### 1. Generazione (Build)
Lo script `scripts/build/make-hybrid-release.sh` gestisce l'intero processo in una directory temporanea isolata:
1.  **Compilazione**: `ncc` analizza `server.ts` e genera `index.js`.
2.  **Asset Harvesting**: Vengono raggruppati i database GeoIP e gli script infrastrutturali.
3.  **Archiviazione**: Crea un file `.tar.gz` pronto per il trasporto.

### 2. Distribuzione (Deploy)
Una volta scompattato l'archivio sul server di destinazione, l'installer `install.sh`:
1.  Configura il servizio `systemd`.
2.  Imposta la variabile d'ambiente `GEODATADIR=./data` (fondamentale per permettere al bundle di trovare i database GeoIP).
3.  Attiva il servizio senza richiedere `npm install`.

---

## 🛠️ Manutenzione e Sviluppo

-   **Sviluppo Locale**: Continua a usare `npm run start` o `ts-node server.ts`. Il processo di release è totalmente ortogonale al codice sorgente.
-   **Aggiunta Dipendenze**: Se aggiungi una dipendenza tramite `npm install`, questa verrà automaticamente inclusa nel prossimo bundle generato, a meno che non sia una dipendenza nativa con asset esterni (in quel caso va aggiunta manualmente allo script di raccolta asset).

---
> [!IMPORTANT]
> L'artefatto generato è "environment-agnostic" per quanto riguarda il codice, ma richiede che il server di destinazione abbia Node.js installato (versione raccomandata >= 20).
