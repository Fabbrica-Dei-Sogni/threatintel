<template>
  <div class="dossier-section ip-whois-section">
    <div class="section-title">
      <span class="icon">📜</span>
      <h3>{{ t('dossierSections.whoisData') }}</h3>
    </div>
    
    <div class="raw-data-container">
      <pre class="whois-text">{{ data.rawData }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpWhoisSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  data: IIpWhoisSectionData;
}>();
</script>

<style scoped src="./sections.css"></style>
<style scoped>
.raw-data-container {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  max-height: 400px;
  overflow-y: auto;
}

.whois-text {
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}
</style>
