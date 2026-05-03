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
    <AttackDetailCore 
        :attack="attack"
        :loading="loading"
        :error="error"
        :ip="ip"
        :ip-list="ipList"
        :is-distributed="true"
        @back="$emit('back')"
        @go-to-ip="ipItem => $emit('go-to-ip', ipItem)"
    />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { fetchDistributedAttackDetail } from '../../api';
import AttackDetailCore from './AttackDetailCore.vue';

const props = defineProps({
    ip: { type: String, required: true }, // IP rappresentante del cluster
    ipList: { type: Array, required: true },
    timeMode: { type: String, default: 'ago' },
    agoValue: { type: Number, default: null },
    agoUnit: { type: String, default: null },
    minLogsForAttack: { type: Number, default: 1 },
    protocol: { type: String, default: null }
});

const emit = defineEmits(['back', 'go-to-ip']);

const route = useRoute();
const attack = ref(null);
const loading = ref(true);
const error = ref(null);

async function loadData() {
    loading.value = true;
    error.value = null;
    try {
        const timeConfig = {
            timeMode: props.timeMode,
            agoValue: props.agoValue,
            agoUnit: props.agoUnit
        };

        if (route.query.dateRange) {
            try {
                const range = JSON.parse(route.query.dateRange);
                timeConfig.startTime = range[0];
                timeConfig.endTime = range[1];
            } catch (e) {
                console.error('Error parsing dateRange:', e);
            }
        }

        attack.value = await fetchDistributedAttackDetail({
            ipList: props.ipList,
            minLogsForAttack: props.minLogsForAttack,
            timeConfig,
            protocol: props.protocol
        });
    } catch (err) {
        console.error('[DistributedAttackView] Error:', err);
        error.value = 'Errore durante il recupero dell\'analisi distribuita.';
    } finally {
        loading.value = false;
    }
}

onMounted(loadData);
</script>
