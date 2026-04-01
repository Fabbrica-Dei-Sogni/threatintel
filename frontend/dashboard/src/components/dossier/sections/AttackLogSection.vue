<template>
  <div class="dossier-section attack-log-section">
    <div class="section-title">
      <span class="icon">📜</span>
      <h3>{{ t('dossierSections.abuseInfo') }} (LOG EVENTO)</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.timestamp') }}</label>
        <span class="value">{{ data.timestamp }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.severity') }}</label>
        <span class="value" :class="getScoreColor(data.score)">{{ data.score }}/10</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.method') }}</label>
        <span class="value amber-text fw-800">{{ data.method }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text">{{ data.ip }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.url') }}</label>
        <span class="value emerald-text url-text">{{ data.url }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.indicators') }}</label>
        <span class="value rose-text indicators-text">{{ data.indicators }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.userAgent') }}</label>
        <span class="value ua-text">{{ data.userAgent }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.payload') }}</label>
        <pre class="payload-box">{{ data.payload }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAttackLogSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IAttackLogSectionData;
}>();

const getScoreColor = (score: number | string) => {
  const s = Number(score);
  if (s > 7) return 'rose-text';
  if (s > 4) return 'amber-text';
  return 'emerald-text';
};
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.fw-800 { font-weight: 800; }

.url-text {
  font-family: monospace;
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

.indicators-text {
  font-size: 0.75rem;
  font-style: italic;
}

.ua-text {
  font-size: 0.7rem;
  color: #64748b;
}

.payload-box {
  background: #000;
  padding: 10px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #fbbf24;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin: 5px 0;
}
</style>
