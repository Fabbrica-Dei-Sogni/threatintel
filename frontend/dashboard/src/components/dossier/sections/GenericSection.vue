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
  <div class="dossier-section human-section">
    <div class="section-title">
      <span class="icon">📝</span>
      <h3>{{ t('dossierSections.humanObservationTitle') }}</h3>
    </div>
    
    <div class="text-content">
      {{ data.text || renderedText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IHumanSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IHumanSectionData;
  renderedText?: string;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.human-section {
  border-left: 2px solid #f59e0b;
  background: rgba(245, 158, 11, 0.03);
  padding-left: 15px;
}

.text-content {
  color: #fde68a;
  font-style: italic;
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
  padding: 10px 0;
}
</style>
