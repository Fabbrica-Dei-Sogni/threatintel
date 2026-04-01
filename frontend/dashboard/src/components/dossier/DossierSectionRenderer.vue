<template>
  <div class="section-renderer-wrapper">
    <component 
      :is="getComponent(section.templateKey)" 
      :data="section.data" 
      :rendered-text="section.renderedText"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { IDossierSection } from '../../models/DossierDTO';

const props = defineProps<{
  section: IDossierSection;
}>();

// Map templateKey to component file names
const componentsMap: Record<string, any> = {
  'clipboard.ip': defineAsyncComponent(() => import('./sections/IpIdentitySection.vue')),
  'clipboard.ipDetails.geo': defineAsyncComponent(() => import('./sections/IpGeoSection.vue')),
  'clipboard.ipDetails.net': defineAsyncComponent(() => import('./sections/IpNetSection.vue')),
  'clipboard.ipDetails.abuse': defineAsyncComponent(() => import('./sections/IpAbuseSection.vue')),
  'clipboard.ipDetails.whois': defineAsyncComponent(() => import('./sections/IpWhoisSection.vue')),
  'clipboard.ipDetails.abuseLog': defineAsyncComponent(() => import('./sections/IpAbuseLogSection.vue')),
  'clipboard.attackDetail.summary': defineAsyncComponent(() => import('./sections/AttackSummarySection.vue')),
  'clipboard.attackDetail.log': defineAsyncComponent(() => import('./sections/AttackLogSection.vue')),
  'clipboard.attackDetail.rateLimitEvent': defineAsyncComponent(() => import('./sections/RateBreachSection.vue')),
  'clipboard.telnetDetail.summary': defineAsyncComponent(() => import('./sections/TelnetSummarySection.vue')),
  'clipboard.telnetDetail.timelineRow': defineAsyncComponent(() => import('./sections/TelnetTimelineRowSection.vue')),
  'clipboard.attackTechnique': defineAsyncComponent(() => import('./sections/AttackTechniqueSection.vue')),
  'clipboard.generic': defineAsyncComponent(() => import('./sections/GenericSection.vue')),
};

const getComponent = (templateKey: string) => {
  return componentsMap[templateKey] || componentsMap['clipboard.generic'];
};
</script>

<style scoped>
.section-renderer-wrapper {
  margin-bottom: 2rem;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
