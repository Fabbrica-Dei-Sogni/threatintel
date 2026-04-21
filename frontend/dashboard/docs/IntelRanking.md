# Guida Sviluppatore: IntelRanking Component

Il componente `IntelRanking` è progettato per visualizzare classifiche di dati in modo compatto, reattivo e compatibile con gli skin (Cyber/Classic).

## 1. Utilizzo Base

Importa il componente e passagli una lista di oggetti.

```vue
<IntelRanking
  title="TOP ATTACCHI"
  :items="dataList"
  detailRouteName="AttackDetail"
  detailItemKey="ip"
/>
```

## 2. Props Principali

| Prop | Tipo | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `title` | String | (Required) | Titolo visualizzato nell'header (in maiuscolo). |
| `items` | Array | `[]` | Lista di oggetti da visualizzare. |
| `loading` | Boolean | `false` | Stato di caricamento. |
| `error` | Boolean | `false` | Stato di errore. |
| `defaultLimit`| String/No | `10` | Numero iniziale di item mostrati. |
| `itemStyle` | String | `''` | Classe CSS extra per lo stile specifico. |
| `detailRouteName`| String | `''` | Nome della rotta Vue per il tasto "Dettaglio" (occhio). |
| `detailItemKey` | String | `'id'` | Chiave dell'oggetto da usare come parametro rotta (es. `request.ip`). |
| `showLimitSelector`| Boolean | `true` | Mostra/Nasconde i tab dei filtri (3, 5, 10...). |

## 3. Layout "Surgical" (Forensic Grid)

Per ottenere il layout a colonne distribuite visto nel cruscotto, usa le classi `item-col-*` all'interno dello slot `#item`.

### Esempio di implementazione chirurgica:

```vue
<IntelRanking :items="myItems" detailRouteName="MyDetail">
  <template #item="{ item }">
    <!-- Colonna 1: Origine -->
    <div class="item-col item-col-origin">
       <CountryFlag :countryCode="item.country" />
       <DefconIndicator :level="item.danger" />
    </div>

    <!-- Colonna 2: Soggetto (Principale) -->
    <div class="item-col item-col-subject">
       <span class="ip-link">{{ item.ip }}</span>
    </div>

    <!-- Colonna 3: Forensics (Dati Temporali) -->
    <div class="item-col item-col-forensics">
       <span class="date-part">{{ item.date }}</span>
       <span class="time-part">{{ item.time }}</span>
    </div>

    <!-- Colonna 4: Metrics (Dati Quantitativi) -->
    <div class="item-col item-col-metrics">
       <div class="activity-badge">
         <span>{{ item.count }}</span>
       </div>
    </div>
  </template>
</IntelRanking>
```

## 4. Header Actions Slot

Puoi aggiungere controlli extra nell'header (es. selettore protocollo) usando lo slot `#header-actions`.

```vue
<template #header-actions>
  <ProtocolSelector v-model="myProto" />
</template>
```

## 5. CSS Customization

Il componente espone diverse variabili CSS per lo skinning. Se crei un nuovo `itemStyle`, puoi sovrascrivere queste variabili nel tuo file CSS:

- `--ranking-accent`: Colore principale (es. Ciano in Cyber).
- `--ranking-highlight`: Colore di accento (es. Rosa in Cyber).

Le righe hanno già transizioni di hover (`transform: translateX(4px)`) e stili per il podio (#1 Oro, #2 Argento, #3 Bronzo) integrati.

---

> [!TIP]
> Usa sempre **JetBrains Mono** per i contenuti delle colonne `subject` e `forensics` nello skin Cyber per mantenere la coerenza visiva dello strumento.
