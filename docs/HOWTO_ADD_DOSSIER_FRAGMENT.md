# Guida Operativa: Aggiungere un nuovo Frammento (Sezione) al Dossier

Questa guida descrive i passaggi standard per integrare un nuovo tipo di "fragment" o sezione all'interno del sistema Dossier del progetto ThreatIntel. Seguendo questi 6 step, potrai passare da un JSON grezzo a una UI reattiva e tipizzata.

## 1. Definizione del Modello (DTO)
File: `frontend/dashboard/src/models/DossierDTO.ts`

Prima di tutto, definisci la struttura dei dati (il payload JSON) e aggiungi un identificatore unico all'enum dei tipi.

```typescript
// 1. Definisci l'interfaccia per i tuoi dati custom
export interface INewFragmentData extends IBaseSectionData {
  fieldA: string;
  fieldB: number;
  timestamp: string;
}

// 2. Aggiungi il tipo all'enum DossierSectionType
export enum DossierSectionType {
  // ... altri tipi
  NEW_FRAGMENT = 'new_fragment'
}
```

## 2. Internazionalizzazione (i18n)
File: `frontend/dashboard/src/locales/*.json` (Tutte le lingue!)

Ogni modifica i18n **deve** essere applicata a tutti i file locale (`it-IT.json`, `en-US.json`, `de-DE.json`, `fr-FR.json`, `pl-PL.json`, `ru-RU.json`).
Aggiungi le etichette necessarie in due punti:
- `dossierSections`: per le etichette dei singoli campi.
- `dossier.sections`: per il nome visualizzato della sezione stessa.

```json
"dossierSections": {
    "fieldALabel": "Etichetta Campo A",
    "newFragmentTitle": "TITOLO NUOVO FRAMMENTO"
},
"dossier": {
    "sections": {
        "new_fragment": "MIO NUOVO FRAGMENT"
    }
}
```

## 3. Creazione del Componente di Visualizzazione (Renderer)
File: `frontend/dashboard/src/components/dossier/sections/NewFragmentSection.vue`

Crea il componente che si occuperà di mostrare i dati in modalità lettura.

```vue
<template>
  <div class="dossier-section">
    <div class="section-title">
      <span class="icon">🔍</span>
      <h3>{{ t('dossierSections.newFragmentTitle') }}</h3>
    </div>
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.fieldALabel') }}</label>
        <span class="value">{{ data.fieldA }}</span>
      </div>
      <!-- ... altri campi -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { INewFragmentData } from '../../../models/DossierDTO';

const { t } = useI18n();
defineProps<{ data: INewFragmentData }>();
</script>
<style scoped src="./sections.css"></style>
```

## 4. Creazione del Componente di Editing (Editor)
File: `frontend/dashboard/src/components/dossier/editors/NewFragmentEditor.vue`

Crea il componente per la modifica reattiva dei dati.

```vue
<template>
  <div class="dossier-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.fieldALabel')">
          <el-input v-model="modelValue.fieldA" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.fieldBLabel')">
          <el-input-number v-model="modelValue.fieldB" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { INewFragmentData } from '../../../models/DossierDTO';

const { t } = useI18n();
defineProps<{ modelValue: INewFragmentData }>();
</script>
<style scoped src="./editors.css"></style>
```

## 5. Registrazione dei Componenti
Devi "istruire" il sistema su quali componenti usare per una determinata `templateKey`.

### Renderer
File: `frontend/dashboard/src/components/dossier/DossierSectionRenderer.vue`
```typescript
const componentsMap: Record<string, any> = {
  // ...
  'my.template.key': defineAsyncComponent(() => import('./sections/NewFragmentSection.vue')),
};
```

### Editor
File: `frontend/dashboard/src/components/dossier/DossierSectionEditor.vue`
```typescript
const editorsMap: Record<string, any> = {
  // ...
  'my.template.key': defineAsyncComponent(() => import('./editors/NewFragmentEditor.vue')),
};
```

## 6. Mapping nello Store
File: `frontend/dashboard/src/stores/dossier.ts`

Assicurati che quando viene catturato un dato con la tua `templateKey`, gli venga assegnato il `type` corretto definito nel punto 1.

```typescript
// 1. Aggiorna l'unione dei tipi nell'interfaccia DossierSection
type: 'ip' | 'attack' | 'new_fragment' | 'generic';

// 2. Aggiorna la logica nella funzione addSection
if (templateKey.includes('my.template.key')) type = 'new_fragment';
```

---
*Documento redatto per garantire la continuità operativa del sistema Dossier.*
