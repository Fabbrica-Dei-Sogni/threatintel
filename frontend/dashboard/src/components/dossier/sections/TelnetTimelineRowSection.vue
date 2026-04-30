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
  <div class="dossier-section telnet-timeline-row">
    <div class="timeline-row">
      <div class="timeline-time">{{ data.timestamp }}</div>
      <div class="timeline-content">
        <label class="timeline-event-name">{{ data.eventName }}</label>
        <div class="timeline-message amber-text">{{ data.message }}</div>
        <div v-if="data.details" class="timeline-details">{{ data.details }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ITelnetTimelineRowData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: ITelnetTimelineRowData;
}>();
</script>

<style scoped src="./sections.css"></style>
