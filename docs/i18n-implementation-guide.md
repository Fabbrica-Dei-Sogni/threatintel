# Guida Completa: Implementazione i18n in Vue 3

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura della Soluzione](#architettura-della-soluzione)
3. [Setup Iniziale](#setup-iniziale)
4. [Struttura dei File](#struttura-dei-file)
5. [Integrazione nei Componenti](#integrazione-nei-componenti)
6. [Selettore Lingua](#selettore-lingua)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Panoramica

Questa guida descrive l'implementazione completa di un sistema di internazionalizzazione (i18n) in un'applicazione Vue 3 utilizzando **Vue I18n v10**.

### Obiettivi Raggiunti

✅ Supporto multilingua (Italiano + Inglese)  
✅ Cambio lingua in tempo reale senza reload  
✅ Persistenza della preferenza utente  
✅ Architettura scalabile per nuove lingue  
✅ Type-safe con TypeScript  

### Tecnologie Utilizzate

- **Vue 3** (Composition API)
- **Vue I18n v10** (libreria ufficiale)
- **TypeScript** (type safety)
- **LocalStorage** (persistenza preferenze)

---

## Architettura della Soluzione

### Schema Concettuale

```mermaid
graph TD
    A[main.ts] -->|registra plugin| B[i18n instance]
    B -->|carica| C[it-IT.json]
    B -->|carica| D[en-US.json]
    E[Componente Vue] -->|usa $t] B
    F[useI18n composable] -->|gestisce| G[locale reattivo]
    G -->|salva in| H[localStorage]
    I[LanguageSwitcher] -->|cambia| F
```

### Vantaggi di Questa Architettura

1. **Separazione delle responsabilità**: traduzioni separate dal codice
2. **Riutilizzabilità**: composable personalizzato per gestione lingua
3. **Manutenibilità**: file JSON centralizzati
4. **Performance**: traduzioni caricate una sola volta

---

## Setup Iniziale

### 1. Installazione Dipendenze

```bash
npm install vue-i18n@10
```

> **Nota**: Usare sempre la versione 10.x per Vue 3

### 2. Struttura Directory

Creare la seguente struttura nella cartella `src`:

```
src/
├── locales/
│   ├── index.ts          # Configurazione i18n
│   ├── it-IT.json        # Traduzioni italiane
│   └── en-US.json        # Traduzioni inglesi
├── composable/
│   └── useI18n.ts        # Composable personalizzato
└── components/
    └── LanguageSwitcher.vue  # Selettore lingua (opzionale)
```

---

## Struttura dei File

### File: `src/locales/index.ts`

Configurazione centrale di Vue I18n:

```typescript
import { createI18n } from 'vue-i18n';
import itIT from './it-IT.json';
import enUS from './en-US.json';

const i18n = createI18n({
  legacy: false,                    // Usa Composition API
  locale: localStorage.getItem('user-locale') || 'it-IT',
  fallbackLocale: 'en-US',
  messages: {
    'it-IT': itIT,
    'en-US': enUS
  },
  globalInjection: true,            // Abilita $t() nei template
  missingWarn: false,
  fallbackWarn: false
});

export default i18n;
```

**Spiegazione delle opzioni:**
- `legacy: false` → Usa Composition API (consigliato per Vue 3)
- `globalInjection: true` → Permette di usare `$t()` direttamente nei template
- `locale` → Legge da localStorage la preferenza salvata
- `fallbackLocale` → Lingua di backup se manca una traduzione

### File: `src/locales/it-IT.json`

Organizzazione gerarchica delle traduzioni:

```json
{
  "common": {
    "save": "Salva",
    "cancel": "Annulla", 
    "loading": "Caricamento...",
    "error": "Errore"
  },
  "auth": {
    "login": "Login",
    "username": "Username",
    "password": "Password"
  },
  "home": {
    "title": "Dashboard Principale",
    "welcomeMessage": "Benvenuto!"
  }
}
```

**Best Practice per Organizzazione:**
- Raggruppare per **feature** o **componente**
- Usare nomi di chiave **descrittivi**
- Mantenere la **stessa struttura** in tutti i file lingua

### File: `src/composable/useI18n.ts`

Composable per gestire il cambio lingua:

```typescript
import { computed } from 'vue';
import { useI18n as vueUseI18n } from 'vue-i18n';

export function useI18n() {
  const i18nInstance = vueUseI18n();

  const locale = computed({
    get: () => i18nInstance.locale.value,
    set: (newLocale: string) => {
      i18nInstance.locale.value = newLocale;
      localStorage.setItem('user-locale', newLocale);
    }
  });

  const setLocale = (newLocale: string) => {
    locale.value = newLocale;
  };

  const availableLocales = ['it-IT', 'en-US'];

  return {
    locale,
    setLocale,
    availableLocales,
    t: i18nInstance.t
  };
}
```

**Caratteristiche:**
- ✅ Locale **reattivo** (computed)
- ✅ **Auto-salvataggio** in localStorage
- ✅ Funzione helper `setLocale()`
- ✅ Shorthand `t` per traduzioni nello script

### Integrazione in `main.ts`

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import i18n from './locales/index';

createApp(App)
  .use(i18n)  // ← Registra il plugin i18n
  .mount('#app');
```

---

## Integrazione nei Componenti

### Opzione 1: Template con `$t()`

Il metodo più semplice e diretto:

```vue
<template>
  <div>
    <h1>{{ $t('home.title') }}</h1>
    <button>{{ $t('common.save') }}</button>
    <p>{{ $t('home.welcomeMessage') }}</p>
  </div>
</template>

<script setup>
// Nessun import necessario grazie a globalInjection
</script>
```

### Opzione 2: Script Setup con `useI18n()`

Per usare traduzioni nello script:

```vue
<template>
  <div>
    <h1>{{ pageTitle }}</h1>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';

const { t } = useI18n();

const pageTitle = computed(() => t('home.title'));
</script>
```

### Esempio Completo: Conversione Componente

**Prima (hardcoded):**
```vue
<template>
  <div class="login">
    <h1>Login</h1>
    <input placeholder="Username" />
    <input placeholder="Password" type="password" />
    <button>Accedi</button>
  </div>
</template>
```

**Dopo (i18n):**
```vue
<template>
  <div class="login">
    <h1>{{ $t('auth.login') }}</h1>
    <input :placeholder="$t('auth.username')" />
    <input :placeholder="$t('auth.password')" type="password" />
    <button>{{ $t('auth.loginButton') }}</button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
```

**Traduzioni aggiunte:**
```json
{
  "auth": {
    "login": "Login",
    "username": "Username", 
    "password": "Password",
    "loginButton": "Accedi"
  }
}
```

---

## Selettore Lingua

### Componente `LanguageSwitcher.vue`

```vue
<template>
  <div class="language-switcher">
    <button 
      v-for="lang in languages" 
      :key="lang.code"
      :class="{ active: locale === lang.code }"
      @click="setLocale(lang.code)"
    >
      {{ lang.flag }} {{ lang.label }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from '../composable/useI18n';

const { locale, setLocale } = useI18n();

const languages = [
  { code: 'it-IT', label: 'IT', flag: '🇮🇹' },
  { code: 'en-US', label: 'EN', flag: '🇬🇧' }
];
</script>

<style scoped>
.language-switcher {
  display: flex;
  gap: 8px;
}

button {
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

button.active {
  font-weight: bold;
  background: #0059b3;
  color: white;
}
</style>
```

### Integrazione nel Layout

```vue
<template>
  <div class="app-header">
    <h1>{{ $t('app.title') }}</h1>
    <LanguageSwitcher />
  </div>
</template>

<script setup>
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
</script>
```

---

## Best Practices

### 1. Organizzazione delle Chiavi

✅ **Buono:**
```json
{
  "user": {
    "profile": {
      "name": "Nome",
      "email": "Email"
    }
  }
}
```

❌ **Evita:**
```json
{
  "userName": "Nome",
  "userEmail": "Email"
}
```

### 2. Naming Convention

- Usa **camelCase** per le chiavi
- Sii **descrittivo** ma **conciso**
- Raggruppa per **contesto/feature**

**Esempi:**
```json
{
  "common": {
    "save": "Salva",
    "cancel": "Annulla"
  },
  "errors": {
    "required": "Campo obbligatorio",
    "invalidEmail": "Email non valida"
  }
}
```

### 3. Valori Dinamici

Per interpolazione di variabili:

```vue
<template>
  <p>{{ $t('user.greeting', { name: userName }) }}</p>
</template>
```

```json
{
  "user": {
    "greeting": "Ciao {name}!"
  }
}
```

### 4. Pluralizzazione

```json
{
  "items": {
    "count": "Nessun elemento | {count} elemento | {count} elementi"
  }
}
```

```vue
<p>{{ $t('items.count', itemCount) }}</p>
```

### 5. Testing delle Traduzioni

Verifica sempre:
- ✅ Tutte le chiavi esistono in **tutti** i file lingua
- ✅ Le traduzioni sono **contestualmente corrette**
- ✅ Non ci sono **chiavi duplicate**

**Tool utile:**
```bash
# Identifica chiavi mancanti confrontando file JSON
diff <(jq -r 'keys' it-IT.json) <(jq -r 'keys' en-US.json)
```

---

## Troubleshooting

### Problema: Traduzione non appare

**Sintomo:** Vedo la chiave invece della traduzione (es. `home.title`)

**Soluzioni:**
1. Verifica che la chiave esista in `it-IT.json` e `en-US.json`
2. Controlla che il plugin i18n sia registrato in `main.ts`
3. Assicurati di usare `$t()` e non `t()` nel template (o viceversa nello script)

### Problema: Errore "Cannot read property 't' of undefined"

**Causa:** i18n non è stato registrato correttamente

**Soluzione:**
```typescript
// In main.ts
import i18n from './locales/index';

createApp(App)
  .use(i18n)  // ← Assicurati di averlo
  .mount('#app');
```

### Problema: Cambio lingua non funziona

**Diagnosi:**
```vue
<script setup>
import { useI18n } from '@/composable/useI18n';

const { locale } = useI18n();

// Debug
console.log('Current locale:', locale.value);
</script>
```

**Verifica:**
1. Il composable salva in localStorage?
2. Il locale è reattivo (computed)?
3. Il componente sta usando il composable corretto?

### Problema: Build fallisce con errore JSON

**Causa:** File JSON malformato (virgola mancante, chiave duplicata)

**Soluzione:**
```bash
# Valida i file JSON
npx jsonlint src/locales/it-IT.json
npx jsonlint src/locales/en-US.json
```

---

## Checklist Implementazione

Usa questa checklist per implementare i18n in una nuova app:

- [ ] Installare `vue-i18n@10`
- [ ] Creare cartella `src/locales/`
- [ ] Creare `it-IT.json` e `en-US.json`
- [ ] Creare `src/locales/index.ts` con configurazione
- [ ] Registrare plugin in `main.ts`
- [ ] Creare `src/composable/useI18n.ts`
- [ ] Creare `LanguageSwitcher.vue` (opzionale)
- [ ] Convertire componenti esistenti
  - [ ] Sostituire testo hardcoded con `$t()`
  - [ ] Aggiungere chiavi ai file JSON
  - [ ] Testare in entrambe le lingue
- [ ] Verificare build: `npm run build`
- [ ] Verificare type-check: `npm run type-check`
- [ ] Testare cambio lingua in tempo reale

---

## Risorse Aggiuntive

- [Vue I18n Documentation](https://vue-i18n.intlify.dev/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

---

## Conclusioni

L'implementazione di i18n in Vue 3 con Vue I18n è:
- ✅ **Semplice** da configurare
- ✅ **Performante** (nessun overhead significativo)
- ✅ **Scalabile** (facile aggiungere nuove lingue)
- ✅ **Type-safe** con TypeScript
- ✅ **Developer-friendly** (API intuitiva)

Questa guida ti permette di replicare l'implementazione su qualsiasi applicazione Vue 3, garantendo un'esperienza utente multilingua professionale.

---

**Autore:** Documentazione creata da implementazione i18n Honeypot Dashboard  
**Data:** Dicembre 2025  
**Versione:** 1.0
