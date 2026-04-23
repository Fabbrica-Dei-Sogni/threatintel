<template>
  <div class="dossier-section scanner-analysis-section">
    <div class="section-title">
      <span class="icon">📡</span>
      <h3>{{ t('dossierSections.scannerAnalysisTitle') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text fw-800">{{ data.src_ip }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.scannerOccurrences') }}</label>
        <span class="value emerald-text">{{ data.totalOccurrences }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.firstSeen') }}</label>
        <span class="value">{{ data.firstSeen }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.lastSeen') }}</label>
        <span class="value">{{ data.lastSeen }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.duration') }}</label>
        <span class="value amber-text">{{ data.duration }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IScannerAnalysisSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IScannerAnalysisSectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.fw-800 { font-weight: 800; }
</style>
