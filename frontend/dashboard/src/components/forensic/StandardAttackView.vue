<template>
    <AttackDetailCore 
        :attack="attack"
        :loading="loading"
        :error="error"
        :ip="ip"
        :is-distributed="false"
        @back="$emit('back')"
        @go-to-ip="ipItem => $emit('go-to-ip', ipItem)"
    />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { fetchAttackDetail } from '../../api';
import AttackDetailCore from './AttackDetailCore.vue';

const props = defineProps({
    ip: { type: String, required: true },
    timeMode: { type: String, default: 'ago' },
    agoValue: { type: Number, default: null },
    agoUnit: { type: String, default: null },
    minLogsForAttack: { type: Number, default: 1 }
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

        // Gestione date custom se presenti nella query
        if (route.query.dateRange) {
            try {
                const range = JSON.parse(route.query.dateRange);
                timeConfig.startTime = range[0];
                timeConfig.endTime = range[1];
            } catch (e) {
                console.error('Error parsing dateRange:', e);
            }
        }

        attack.value = await fetchAttackDetail({
            ip: props.ip,
            minLogsForAttack: props.minLogsForAttack,
            timeConfig
        });
    } catch (err) {
        console.error('[StandardAttackView] Error:', err);
        error.value = 'Errore durante il recupero del dettaglio attacco.';
    } finally {
        loading.value = false;
    }
}

onMounted(loadData);
</script>
