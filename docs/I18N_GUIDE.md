# Guida Rapida i18n - Dashboard Vue

## Come usare le traduzioni

### Nel template
```vue
<h1>{{ $t('home.title') }}</h1>
```

### Nello script
```vue
<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const titolo = t('home.title');
</script>
```

## Aggiungere nuove traduzioni

1. Modifica `src/locales/it-IT.json` e `src/locales/en-US.json`
2. Aggiungi la chiave nel modulo appropriato
3. Usa `$t('modulo.chiave')` nel componente

## Cambiare lingua

```vue
<script setup>
import { useI18n } from '@/composable/useI18n';
const { setLocale } = useI18n();

// Cambia a inglese
setLocale('en-US');
</script>
```

## File importanti

- `src/locales/it-IT.json` - Traduzioni italiane
- `src/locales/en-US.json` - Traduzioni inglesi
- `src/locales/index.ts` - Configurazione i18n
- `src/composable/useI18n.ts` - Composable per gestione lingua
