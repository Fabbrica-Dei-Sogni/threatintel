<template>
  <div class="dossier-section ip-geo-section">
    <div class="section-title">
      <span class="icon">🌍</span>
      <h3>{{ t('dossierSections.locationInfo') }}</h3>
    </div>
    
    <div class="data-grid">
      <div class="data-item">
        <label>{{ t('dossierSections.ip') }}</label>
        <span class="value cyan-text">{{ data.ip }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.country') }}</label>
        <span class="value">{{ data.country }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.city') }}</label>
        <span class="value">{{ data.city }}, {{ data.region }}</span>
      </div>
      <div class="data-item">
        <label>{{ t('dossierSections.timezone') }}</label>
        <span class="value">{{ data.timezone }}</span>
      </div>
      <div class="data-item full-width">
        <label>{{ t('dossierSections.coordinates') }}</label>
        <span class="value coordinates">{{ data.gps }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpGeoSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IIpGeoSectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
