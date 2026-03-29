# Componente BreakingNews

Il componente `BreakingNews.vue` è una dashboard di intelligence in tempo reale che aggrega dati da diverse fonti (Attacchi HTTP, Sessioni Cowrie/Telnet e Log generici) per mostrare notizie discorsive e giornalistiche.

## Parametri (Props)

Il componente accetta i seguenti parametri:

| Parametro | Tipo | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `attacks` | `Array` | `[]` | Lista degli ultimi oggetti `AttackDTO`. Usata per analisi geopolitica e DEFCON. |
| `sessions` | `Array` | `[]` | Lista delle sessioni Telnet/SSH. Usata per analizzare la persistenza degli attori. |
| `logs` | `Array` | `[]` | Lista di log raw. Usata per identificare pattern di "Target Discovery" su URL specifici. |
| `mode` | `String` | `'typewriter'` | Determina lo stile di visualizzazione: `'typewriter'` (scorrimento verticale/digitazione) o `'ticker'` (scorrimento orizzontale continuo). |
| `isVisible` | `Boolean` | `true` | Controlla la visibilità del componente (usato per l'effetto apparizione/scomparsa se desiderato). |

## Integrazione Esempio

Per utilizzare il componente in una pagina Vue:

```vue
<template>
  <BreakingNews 
    mode="ticker" 
    :attacks="recentAttacks" 
    :sessions="recentSessions" 
    :logs="recentLogs"
    :isVisible="true"
  />
</template>

<script setup>
import BreakingNews from '@/components/BreakingNews.vue';
// ... recupero dati dalle store o dai composable ...
</script>
```

## Logica di Analisi Automatica

Il componente applica una logica narrativa ai dati grezzi:
- **Case Sensitive**: Il testo utilizza la capitalizzazione standard (non tutto maiuscolo) per una migliore leggibilità.
- **Pulizia URL**: Converte automaticamente `/` o `\` in etichette leggibili come "punto di ingresso principale".
- **Geopolitica**: Identifica il paese con la frequenza di attacco più alta nell'ultimo batch.
- **DEFCON**: Calcola il livello di minaccia medio basandosi sulla severità degli attacchi ricevuti.

## Personalizzazione Notizie

Per aggiungere nuove tipologie di notizie, è sufficiente modificare la funzione `computed` `headlines` all'interno di `BreakingNews.vue`, aggiungendo un oggetto con:
- `text`: Il messaggio tradotto (usando `t()`).
- `countryCode`: (Opzionale) Codice ISO per mostrare la bandiera.
- `icon`: (Opzionale) Emoji per categorizzare la notizia.
