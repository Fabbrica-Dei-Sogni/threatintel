<template>
  <div class="dossier-section attack-summary-section">
    <div class="section-title">
      <span class="icon">⚔️</span>
      <h3>{{ t('dossierSections.abuseInfo') }} {{ t('dossierSections.attackSummarySuffix') }}</h3>
      <span v-if="data.defcon" class="badge-defcon" :class="`defcon-${data.defcon}`">DEFCON {{ data.defcon }}</span>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text">{{ data.ip }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.severity') }}</label>
        <span class="value" :class="getScoreColor(data.score)">{{ data.score }}/10</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.logsCount') }}</label>
        <span class="value">{{ data.totalLogs }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.duration') }}</label>
        <span class="value">{{ data.duration }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.rps') }}</label>
        <span class="value amber-text">{{ data.rps }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.avgScore') }}</label>
        <span class="value emerald-text">{{ data.avgScore }}</span>
      </div>
      
      <div class="data-item full-width">
        <label>{{ t('dossierSections.techniques') }}</label>
        <span class="value techniques-list">{{ data.techniques }}</span>
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
        <label>{{ t('dossierSections.intensity') }}</label>
        <span class="value amber-text">{{ data.intensity }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAttackSummarySectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IAttackSummarySectionData;
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
.techniques-list {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #10b981;
}

.badge-defcon {
  margin-left: auto;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 900;
  font-size: 0.7rem;
}

.defcon-5 { background: #10b981; color: #fff; }
.defcon-4 { background: #3b82f6; color: #fff; }
.defcon-3 { background: #f59e0b; color: #fff; }
.defcon-2 { background: #ef4444; color: #fff; }
.defcon-1 { background: #7f1d1d; color: #fff; }
</style>
