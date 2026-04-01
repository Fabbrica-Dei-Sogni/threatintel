# Guida all'Integrazione Sezioni Dossier "Premium"

Questa guida descrive come trasformare un frammento di testo (clipboard) in una sezione forense strutturata e graficamente avanzata nel sistema di reporting.

---

## 1. Definizione del Blueprint (i18n)

Ogni sezione deve avere una chiave univoca nei file `core/locales/*.json`. 
Esistono due scopi per queste chiavi:

### A. Rendering Testuale (Clipboard)
Sotto la chiave `reports.clipboard`, definisci come il testo deve apparire quando viene incollato in un editor di testo semplice (es. blocco note).

```json
"clipboard": {
  "miaSezione": [
    "--- MIO TITOLO ---",
    "DATO 1: {campo1}",
    "DATO 2: {campo2}",
    "------------------"
  ]
}
```

### B. Titoli per Report (Fragments)
Sotto `reports.fragments`, definisci l'etichetta usata come titolo nel PDF.

```json
"fragments": {
  "miaSezioneTitle": "Analisi Dettagliata Mia Sezione"
}
```

---

## 2. Cattura Frontend (Vue)

Per inviare i dati al tracker del dossier, usa il composable `useClipboard`.

### Esempio di implementazione:
In un componente Vue, importa e usa `copyFormatted`:

```javascript
import { useClipboard } from '../../composable/useClipboard';
const { copyFormatted } = useClipboard();

const captureData = () => {
    const data = {
        campo1: "Valore A",
        campo2: "Valore B"
    };
    // Invia al Dossier e copia negli appunti
    copyFormatted('clipboard.miaSezione', data);
};
```

> [!NOTE]
> `copyFormatted` fa due cose:
> 1. Invia la chiave e l'oggetto dati al `DossierStore` (se la registrazione è attiva).
> 2. Genera la stringa di testo basata sul blueprint i18n e la mette negli appunti di sistema.

---

## 3. Motore di Rendering Backend (TypeScript)

Quando il backend genera il dossier, riceve una lista di sezioni composte da `templateKey` e `data`.

### Il Servizio `ReportService.ts`
Il metodo `renderSection` si occupa di iniettare i dati reali nel blueprint del JSON:

1. Recupera il template usando la `templateKey` (es. `reports.clipboard.miaSezione`).
2. Sostituisce i segnaposto `{campo1}` con `data.campo1`.
3. Se un dato è mancante, usa il valore di fallback `reports.common.notAvailable`.

---

## 4. Visualizzazione Grafica (EJS)

Il PDF non usa il testo semplice, ma frammenti EJS dedicati.

### A. Creazione dei Frammenti
Crea due file (uno per ogni stile):
- `core/templates/reports/fragments/classic/mia-sezione.ejs`
- `core/templates/reports/fragments/hud/mia-sezione.ejs`

**Esempio HUD fragment:**
```html
<div class="hud-item">
    <div class="hud-box-header">MI DATI</div>
    <div class="hud-metric">
        <span class="hud-label">CAMPO 1</span>
        <span class="hud-val"><%= data.campo1 %></span>
    </div>
</div>
```

### B. Mappatura nel Dossier
In `classic-dossier.ejs` e `hud-dossier.ejs`, aggiungi la logica di smistamento:

```javascript
// Esempio in classic-dossier.ejs
else if (section.templateKey === 'clipboard.miaSezione') fragmentName = 'mia-sezione';
```

---

## 5. Ricapitolando il Flusso
1. **Frontend**: `copyFormatted('key', data)` -> Registra `key` + `data`.
2. **Backend**: Riceve JSON -> `ReportService` valida e pulisce i dati.
3. **EJS**: Il template principale vede `key`, seleziona il frammento `mia-sezione.ejs` e gli passa `data`.
4. **PDF**: Viene renderizzato l'HTML premium invece del testo grezzo.
