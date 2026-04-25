# Guida al Refactoring CSS: IntelRanking Layout Contract

## 1. Il Problema Originale: Layout Leakage
Durante lo sviluppo del widget **Campagne**, è emersa la necessità di un layout multi-riga (verticale) per visualizzare URL e Tech Tags. Implementando questa modifica con selettori generici (es. `.item-col-subject`), lo stile è "trapelato" (leaked) in tutti gli altri widget della Home.

### Sintomi:
- Le card delle "Anomalie" e dei "Log" sono diventate "ciccione" (troppo alte).
- Gap verticali indesiderati tra testi che dovevano stare su una sola riga.
- Difficoltà nel mantenere la densità informativa tipica di una dashboard NOC.

---

## 2. La Soluzione: "Layout Contract" via CSS Variables
La best practice utilizzata è quella del **Layout Contract**. Invece di forzare uno stile dal componente figlio o dal genitore in modo rigido, abbiamo stabilito un contratto basato su variabili CSS.

### A. Il Componente Base (IntelRanking.css)
Il componente `IntelRanking` non "decide" più la direzione del layout, ma la **chiede** all'ambiente circostante.

```css
/* IntelRanking.css */
.item-col-subject {
  display: flex;
  /* Se la variabile non è definita, il fallback è 'row' (compatto) */
  flex-direction: var(--col-subject-direction, row);
  align-items: var(--col-subject-align, center);
  gap: var(--col-subject-gap, 0);
}
```

### B. La Specializzazione (Home.vue)
Il genitore (Home) decide quando attivare il layout "speciale" solo per istanze specifiche, usando la prop `itemStyle` come namespace.

```css
/* Home.vue */
.campaigns-ranking {
  --col-subject-direction: column;
  --col-subject-align: flex-start;
  --col-subject-gap: 8px;
  --ranking-item-min-height: 72px;
}
```

---

## 3. Best Practices Utilizzate

### 1. CSS Variable Defaults (Il potere del Fallback)
L'uso di `var(--nome, default)` permette al componente di funzionare perfettamente anche se il genitore non specifica nulla. Questo garantisce che nuove card aggiunte in futuro siano "snelle" di default.

### 2. Surgical Scoping (Namespace)
Abbiamo rimosso gli stili dai tag generici (`li`, `span`) e li abbiamo legati a classi di scopo (`.campaigns-ranking`). 
**Regola d'oro**: Mai stilizzare tag nudi in una dashboard complessa; usa sempre classi che descrivano la funzione o il contesto.

### 3. Decoupling Structural vs Thematic
- **Structural (IntelRanking.css)**: Gestisce *come* gli elementi si muovono (flex, grid, overflow).
- **Thematic (Home.vue / HomeCyber.css)**: Gestisce *che aspetto* hanno (colori, font, ombre) e le varianti specifiche di business (multi-linea vs riga singola).

### 4. Media Queries via Variables
Invece di riscrivere intere regole CSS nei media query per mobile, abbiamo semplicemente cambiato il valore della variabile:
```css
@media (max-width: 768px) {
  .campaigns-ranking {
    --col-subject-gap: 4px; /* Cambia solo lo spazio, non il layout */
  }
}
```

---

## 4. Vantaggi per il Futuro
- **Indipendenza**: Se domani aggiungi un widget "Geolocalizzazione", ti basterà creare una classe `.geo-ranking` e definire le sue variabili senza toccare una riga delle Anomalie.
- **Manutenibilità**: Per cambiare l'altezza di tutte le card della Home, basta cambiare una variabile nel componente base.
- **Performance**: Il browser gestisce le variabili CSS in modo estremamente efficiente, riducendo i ricalcoli del layout (reflow).

---
*Documentazione redatta per il progetto ThreatIntel - Dashboard Forensic Refactoring.*
