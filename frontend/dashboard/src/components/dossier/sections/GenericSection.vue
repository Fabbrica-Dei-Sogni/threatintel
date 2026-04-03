<template>
  <div class="dossier-section human-section">
    <div class="section-title">
      <span class="icon">📝</span>
      <h3>{{ t('dossierSections.humanObservationTitle') }}</h3>
    </div>
    
    <div class="text-content">
      {{ data.text || renderedText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IHumanSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IHumanSectionData;
  renderedText?: string;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.human-section {
  border-left: 2px solid #f59e0b;
  background: rgba(245, 158, 11, 0.03);
  padding-left: 15px;
}

.text-content {
  color: #fde68a;
  font-style: italic;
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
  padding: 10px 0;
}
</style>
