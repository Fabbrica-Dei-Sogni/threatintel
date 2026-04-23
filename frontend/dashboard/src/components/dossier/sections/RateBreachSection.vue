<template>
  <div class="dossier-section rate-breach-section">
    <div class="section-title">
      <span class="animated-icon pulse-magma">⚡</span>
      <h3>{{ t('dossierSections.rateBreachTitle') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.timestamp') }}</label>
        <span class="value">{{ data.timestamp }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text">{{ data.ip }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.limitType') }}</label>
        <span class="value pulse-magma-mini">{{ data.limitType }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.method') }}</label>
        <span class="value amber-text fw-800">{{ data.method }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.url') }} {{ t('dossierSections.pathSuffix') }}</label>
        <span class="value emerald-text url-text">{{ data.path }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.userAgent') }}</label>
        <span class="value ua-text">{{ data.userAgent }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.honeypotId') }}</label>
        <span class="value cobalt-text">{{ data.honeypotId }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.message') }}</label>
        <span class="value rose-text message-text">{{ data.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IRateBreachSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IRateBreachSectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.fw-800 { font-weight: 800; }
.url-text { font-family: monospace; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; }
.ua-text { font-size: 0.7rem; color: #64748b; }
.message-text { font-family: monospace; font-size: 0.85rem; }
.pulse-magma-mini {
    background: linear-gradient(135deg, #ff4d4d, #f97316);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
}
.cobalt-text { color: #3b82f6; }
</style>
