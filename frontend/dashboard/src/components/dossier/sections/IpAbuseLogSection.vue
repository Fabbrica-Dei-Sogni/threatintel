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
  <div class="dossier-section ip-abuse-log-section">
    <div class="section-title">
      <span class="icon">🚩</span>
      <h3>{{ t('dossierSections.abuseInfo') }} {{ t('dossierSections.logDetailSuffix') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.date') }}</label>
        <span class="value">{{ data.date }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.reporter') }}</label>
        <span class="value cyan-text">{{ data.reporter }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.categories') }}</label>
        <span class="value emerald-text">{{ data.categories }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.comment') }}</label>
        <div class="comment-box">
          {{ data.comment }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpAbuseLogSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IIpAbuseLogSectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.comment-box {
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #e2e8f0;
  line-height: 1.5;
  font-style: italic;
  margin-top: 5px;
}
</style>
