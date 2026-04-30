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
  <div class="section-editor-wrapper">
    <component 
      :is="getComponent(templateKey)" 
      v-model="internalData"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, computed } from 'vue';

const props = defineProps<{
  templateKey: string;
  modelValue: any;
}>();

const emit = defineEmits(['update:modelValue']);

// Map templateKey to editor file names
const editorsMap: Record<string, any> = {
  'clipboard.ip': defineAsyncComponent(() => import('./editors/IpIdentityEditor.vue')),
  'clipboard.ipDetails.geo': defineAsyncComponent(() => import('./editors/IpGeoEditor.vue')),
  'clipboard.ipDetails.net': defineAsyncComponent(() => import('./editors/IpNetEditor.vue')),
  'clipboard.ipDetails.abuse': defineAsyncComponent(() => import('./editors/IpAbuseEditor.vue')),
  'clipboard.ipDetails.whois': defineAsyncComponent(() => import('./editors/IpWhoisEditor.vue')),
  'clipboard.ipDetails.abuseLog': defineAsyncComponent(() => import('./editors/IpAbuseLogEditor.vue')),
  'clipboard.attackDetail.summary': defineAsyncComponent(() => import('./editors/AttackSummaryEditor.vue')),
  'clipboard.attackDetail.log': defineAsyncComponent(() => import('./editors/AttackLogEditor.vue')),
  'clipboard.attackDetail.rateLimitEvent': defineAsyncComponent(() => import('./editors/RateBreachEditor.vue')),
  'clipboard.telnetDetail.summary': defineAsyncComponent(() => import('./editors/TelnetSummaryEditor.vue')),
  'clipboard.telnetDetail.timelineRow': defineAsyncComponent(() => import('./editors/TelnetTimelineRowEditor.vue')),
  'clipboard.telnetDetail.scannerAnalysis': defineAsyncComponent(() => import('./editors/ScannerAnalysisEditor.vue')),
  'clipboard.attackTechnique': defineAsyncComponent(() => import('./editors/AttackTechniqueEditor.vue')),
  'clipboard.generic': defineAsyncComponent(() => import('./editors/GenericEditor.vue')),
};

const getComponent = (templateKey: string) => {
  return editorsMap[templateKey] || editorsMap['clipboard.generic'];
};

const internalData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});
</script>

<style scoped>
.section-editor-wrapper {
  margin-top: 10px;
}
</style>
