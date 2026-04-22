# Guida alla Gestione della Paginazione e Ricerca (Frontend)

Questa guida documenta il sistema di paginazione e filtraggio utilizzato nel frontend di ThreatIntel, basato sul pattern **Composable Composition**.

## Architettura del Sistema

La ricerca nel progetto segue un flusso a tre livelli per garantire consistenza e sincronizzazione con l'URL:

1.  **Router (URL)**: La sorgente della verità. I parametri di ricerca (pagina, filtri, ordinamento) sono salvati nella query string.
2.  **View (Componente .vue)**: Riceve le `props` dal router e le sincronizza con dei `ref` locali.
3.  **Composable (`useSearchBase`)**: Gestisce la logica di core: debounce del fetch, reset della pagina al cambio dei filtri e ordinamento.

---

## Il Composable `useSearchBase.ts`

È il "motore" di tutte le tabelle del progetto. Il suo compito principale è osservare i filtri e decidere quando eseguire una chiamata al server o quando resettare la pagina.

### 1. Deep Comparison (Cruciale per Array e Oggetti)
Per evitare il bug del "reset infinito a pagina 1", il composable esegue un confronto profondo sui filtri. 
*   **Problema**: In JavaScript, `[1,2] !== [1,2]`. Se un filtro è un array (come `dateRange`), Vue segnalerebbe un cambiamento ad ogni render, resettando la pagina.
*   **Soluzione**: Utilizziamo `JSON.stringify` per confrontare il contenuto reale dei filtri complessi.

```typescript
// Estratto dalla logica di confronto in useSearchBase.ts
if (typeof nv === 'object' && nv !== null) {
    return JSON.stringify(nv) !== JSON.stringify(ov);
}
return nv !== ov;
```

### 2. Reset Intelligente della Pagina
Il sistema è progettato per:
*   **Tornare a pagina 1** se l'utente cambia un criterio di ricerca (es. cambia IP o data).
*   **Mantenere la pagina corrente** se l'utente sta solo cambiando l'ordinamento o se la pagina cambia via URL (es. pulsante "Avanti").

---

## Implementazione in una View

Per implementare correttamente la paginazione in una nuova pagina, seguire questi passaggi:

### 1. Definizione Props
Le props devono mappare i parametri della query string:
```javascript
const props = defineProps({
    initialPage: { type: Number, default: 1 },
    initialIp: String,
    // ...altri filtri
});
```

### 2. Sincronizzazione Prop -> Ref (Watcher con Guard)
È fondamentale aggiungere un controllo `if (ref.value !== propValue)` prima di aggiornare il ref locale, per evitare loop di aggiornamento circolari.

```javascript
watch(() => props.initialPage, (v) => { 
    const targetPage = v ?? 1;
    if (page.value !== targetPage) {
        page.value = targetPage; 
    }
});
```

### 3. Sincronizzazione Ref -> URL
Ogni cambiamento dei ref locali deve riflettersi nell'URL tramite `router.replace`:

```javascript
watch([page, filterIp, sortFields], ([newPage, newIp, newSort]) => {
    router.replace({
        name: 'MyView',
        query: {
            page: newPage > 1 ? newPage : undefined,
            ip: newIp || undefined,
            sortFields: JSON.stringify(newSort)
        }
    });
});
```

---

## Problemi Comuni e Troubleshooting

### La pagina torna sempre a 1 quando premo "Next"
*   **Causa**: Un filtro (spesso un array come `dateRange`) viene percepito come "diverso" anche se il contenuto è lo stesso.
*   **Fix**: Controllare che il filtro sia incluso nell'array `filterRefs` passato a `useSearchBase` e che la logica di `JSON.stringify` sia attiva.

### Doppia chiamata al server all'avvio
*   **Causa**: `isFirstRun` non gestito correttamente o `immediate: true` nel watcher che scatta contemporaneamente all'inizializzazione dei ref.
*   **Fix**: `useSearchBase` ignora il primo cambio se `oldVal` è `undefined`.

### I pulsanti del browser "Avanti/Indietro" non funzionano
*   **Causa**: Mancano i watcher sulle props `initialPage` o `initialIp`.
*   **Fix**: Aggiungere i watcher documentati nel punto "Sincronizzazione Prop -> Ref".
