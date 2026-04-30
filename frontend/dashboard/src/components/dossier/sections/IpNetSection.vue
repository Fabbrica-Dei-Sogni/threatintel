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
  <div class="dossier-section ip-net-section">
    <div class="section-title">
      <span class="icon">📡</span>
      <h3>{{ t('dossierSections.networkInfo') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text">{{ data.ip }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.organization') }}</label>
        <span class="value amber-text">{{ data.org }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.hostname') }}</label>
        <span class="value">{{ data.hostname }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpNetSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IIpNetSectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
