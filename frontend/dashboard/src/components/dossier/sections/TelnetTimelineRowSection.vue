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
