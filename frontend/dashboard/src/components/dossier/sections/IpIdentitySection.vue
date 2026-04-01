<template>
  <div class="dossier-section ip-identity-section">
    <div class="section-title">
      <span class="icon">👤</span>
      <h3>{{ t('dossierSections.abuseInfo') }} (IDENTIFICAZIONE SOGGETTO)</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item full-width">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text big-text">{{ data.ip }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IIpSectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.big-text {
  font-size: 1.5rem;
  font-weight: 800;
  font-family: monospace;
}
</style>
