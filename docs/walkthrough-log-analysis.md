# Walkthrough: Log Analysis & Hardening

**Data**: 2026-01-09
**Versione**: 1.1.0
**Feature**: Log Analysis & Recalibration (SSH + HTTP)

---

## 📋 Obiettivo

Implementare un sistema flessibile per la ri-analisi dei log storici (SSH e HTTP) al fine di applicare nuove regole di scoring o correggere classificazioni passate basandosi su configurazioni aggiornate.

---

## 🎯 Funzionalità Implementate

### 1. SSH Log Recalibration

**Problema**: Gli score dei log SSH erano hardcoded e immutabili una volta salvati. Inoltre, un bug di tipizzazione (string vs number) causava problemi nel salvataggio.

**Soluzione**:
1.  **Configurazione Dinamica**: I punteggi per `SSH_FAILED_PASSWORD` e `SSH_INVALID_USER` sono ora caricati da MongoDB all'avvio del servizio.
2.  **Metodo `analyzeSshLogs`**: Nuovo metodo in `SshLogService` che itera su tutti i log SSH esistenti.
3.  **Logica di Aggiornamento**:
    - Recupera batch di log (default 100)
    - Ricalcola lo score in base ai valori attuali
    - Aggiorna il documento su DB se necessario

**Esempio di utilizzo (API)**:
Il metodo è esposto tramite l'endpoint di analisi globale.

---

### 2. HTTP Log Filtering & Legacy Support

**Problema**: L'analisi dei log HTTP includeva erroneamente anche log di altri protocolli (es. SSH) se non filtrati correttamente, e rischiava di ignorare log legacy senza campo `protocol`.

**Soluzione**:
1.  **Filtro Esplicito**: Aggiornato `ThreatLogService.analyzeLogs` per targettizzare solo:
    - `{ protocol: 'http' }`
    - `{ protocol: null }` (Legacy logs)
    - `{ protocol: { $exists: false } }` (Legacy logs)
2.  **Esclusione SSH**: I log con `protocol: 'ssh'` sono ora esclusi dall'analisi HTTP, prevenendo falsi positivi o errori di parsing.

---

## 🔧 Dettagli Tecnici

### API Integration

L'endpoint `POST /api/analyze` (o equivalente rotta di gestione) è stato aggiornato per orchestrare entrambi i flussi:

```typescript
// core/apis/threatroutes.ts

const { batchSize = 100, updateDatabase = true } = req.body;

// 1. Analisi HTTP (ThreatLogService)
const resultHttp = await threatLoggerService.analyzeLogs({ batchSize, updateDatabase });

// 2. Analisi SSH (SshLogService) - Nuovo!
const resultSsh = await sshLogService.analyzeSshLogs(batchSize);

res.json({ http: resultHttp, ssh: resultSsh });
```

### Testing

Una nuova test suite in `core/__tests__/SshLogService.test.ts` verifica:
- Caricamento corretto delle configurazioni (con parsing interi)
- Utilizzo dei valori di default se config mancante
- Funzionamento del metodo `analyzeSshLogs` su log mockati

---

## 🚀 Risultati

- ✅ **Flessibilità**: Possibilità di cambiare la severità degli attacchi SSH retroattivamente.
- ✅ **Clean Data**: Separazione netta tra analisi HTTP e SSH.
- ✅ **Robustezza**: Gestione corretta dei tipi di dato e dei log legacy.
