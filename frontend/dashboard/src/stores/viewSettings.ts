import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useViewSettingsStore = defineStore('viewSettings', () => {
    // Load initial state from localStorage or use defaults
    const storageKey = 'hp_view_settings';
    const savedSettings = JSON.parse(localStorage.getItem(storageKey) || '{}');

    // Attacks View
    const attacksShowMap = ref<boolean>(savedSettings.attacksShowMap ?? false);
    const attacksShowChart = ref<boolean>(savedSettings.attacksShowChart ?? true);

    // Threat Logs View
    const logsShowChart = ref<boolean>(savedSettings.logsShowChart ?? true);

    // Cowrie Sessions View
    const sessionsShowMap = ref<boolean>(savedSettings.sessionsShowMap ?? false);
    const sessionsShowChart = ref<boolean>(savedSettings.sessionsShowChart ?? true);

    // Persistence logic
    watch(
        [attacksShowMap, attacksShowChart, logsShowChart, sessionsShowMap, sessionsShowChart],
        () => {
            const settings = {
                attacksShowMap: attacksShowMap.value,
                attacksShowChart: attacksShowChart.value,
                logsShowChart: logsShowChart.value,
                sessionsShowMap: sessionsShowMap.value,
                sessionsShowChart: sessionsShowChart.value
            };
            localStorage.setItem(storageKey, JSON.stringify(settings));
        },
        { deep: true }
    );

    return {
        attacksShowMap,
        attacksShowChart,
        logsShowChart,
        sessionsShowMap,
        sessionsShowChart
    };
});
