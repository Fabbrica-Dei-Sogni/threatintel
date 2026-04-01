<template>
  <div class="dossier-section attack-technique-section">
    <div class="section-title">
      <span class="icon">🛠️</span>
      <h3>{{ t('dossierSections.techniques') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item full-width">
        <label>{{ t('dossierSections.eventName') }}</label>
        <span class="value emerald-text tech-badge">{{ data.tech }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAttackTechniqueData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IAttackTechniqueData;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.tech-badge {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 700;
  display: inline-block;
}
</style>
