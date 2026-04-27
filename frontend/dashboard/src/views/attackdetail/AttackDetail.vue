<template>
    <div class="attack-detail-orchestrator">
        <component 
            :is="viewComponent"
            :ip="props.ip"
            :ip-list="parsedIpList"
            :time-mode="props.timeMode"
            :ago-value="props.agoValue"
            :ago-unit="props.agoUnit"
            :min-logs-for-attack="props.minLogsForAttack"
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
    ipList: { type: [Array, String], default: null }, // Può arrivare come stringa JSON dalla query o array
    timeMode: { type: String, default: 'ago' },
    agoValue: { type: Number, default: null },
    agoUnit: { type: String, default: null },
    minLogsForAttack: { type: Number, default: 1 }
});

const router = useRouter();

// Determina se siamo in modalità distribuita e normalizza la lista IP
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

// Seleziona il componente corretto
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
