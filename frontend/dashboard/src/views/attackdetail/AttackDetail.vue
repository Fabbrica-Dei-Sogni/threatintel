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
  <div class="attack-detail-orchestrator">
    <component 
      :is="viewComponent"
      :ip="ip"
      :ip-list="parsedIpList"
      :time-mode="timeMode"
      :ago-value="agoValue"
      :ago-unit="agoUnit"
      :min-logs-for-attack="minLogsForAttack"
      :protocol="protocol"
      @back="goBack"
      @go-to-ip="goToIpDetails"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import StandardAttackView from '../../components/forensic/StandardAttackView.vue';
import DistributedAttackView from '../../components/forensic/DistributedAttackView.vue';

const props = defineProps({
  ip: { type: String, required: true },
  ipList: { type: [Array, String], default: null },
  timeMode: { type: String, default: 'ago' },
  agoValue: { type: Number, default: null },
  agoUnit: { type: String, default: null },
  minLogsForAttack: { type: Number, default: 1 },
  protocol: { type: String, default: 'http' }
});

const router = useRouter();

const parsedIpList = computed(() => {
  if (!props.ipList) return null;
  if (Array.isArray(props.ipList)) return props.ipList;
  try {
    return JSON.parse(props.ipList);
  } catch (e) {
    return null;
  }
});

const isDistributed = computed(() => {
  return parsedIpList.value && parsedIpList.value.length > 1;
});

const viewComponent = computed(() => {
  return isDistributed.value ? DistributedAttackView : StandardAttackView;
});

function goBack() {
  router.back();
}

function goToIpDetails(ip) {
  router.push(`/ip/${ip}`);
}
</script>

<style scoped>
.attack-detail-orchestrator {
  min-height: 100vh;
  background: var(--cy-bg-dark, #0a0a0b);
}
</style>
