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
  <div class="dossier-section telnet-summary-section">
    <div class="section-title">
      <span class="icon">🖥️</span>
      <h3>{{ t('dossierSections.abuseInfo') }} {{ t('dossierSections.telnetSessionSuffix') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.sessionId') }}</label>
        <span class="value amber-text fw-800">{{ data.sessionId }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text">{{ data.ip }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.timeWindow') }}</label>
        <span class="value">{{ data.timeWindow }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.origin') }}</label>
        <span class="value">{{ data.origin }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.eventsCount') }}</label>
        <span class="value emerald-text">{{ data.totalEvents }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ITelnetSummarySectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: ITelnetSummarySectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.fw-800 { font-weight: 800; }
</style>
