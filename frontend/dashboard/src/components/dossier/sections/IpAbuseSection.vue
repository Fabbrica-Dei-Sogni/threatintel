<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
<template>
  <div class="dossier-section ip-abuse-section">
    <div class="section-title">
      <span class="icon">🛡️</span>
      <h3>{{ t('dossierSections.abuseInfo') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.abuseScore') }}</label>
        <span class="value" :class="getScoreColor(data.score)">{{ data.score }}%</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.isListed') }}</label>
        <span class="value" :class="data.listed ? 'rose-text' : 'emerald-text'">{{ data.listed ? t('common.yes') : t('common.no') }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.reportsCount') }}</label>
        <span class="value">{{ data.total }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.lastReport') }}</label>
        <span class="value">{{ data.lastReport }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpAbuseSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IIpAbuseSectionData;
}>();

const getScoreColor = (score: number | string) => {
  const s = Number(score);
  if (s > 75) return 'rose-text';
  if (s > 30) return 'amber-text';
  return 'emerald-text';
};
</script>

<style scoped src="./sections.css"></style>
