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

    // Home Dashboard (Persistent Maps & Skin)
    const homeShowAttackMap = ref<boolean>(savedSettings.homeShowAttackMap ?? false);
    const homeShowSessionsMap = ref<boolean>(savedSettings.homeShowSessionsMap ?? false);
    const dashboardSkin = ref<string>(savedSettings.dashboardSkin ?? 'cyber');

    // Persistence logic
    watch(
        [attacksShowMap, attacksShowChart, logsShowChart, sessionsShowMap, sessionsShowChart, homeShowAttackMap, homeShowSessionsMap, dashboardSkin],
        () => {
            const settings = {
                attacksShowMap: attacksShowMap.value,
                attacksShowChart: attacksShowChart.value,
                logsShowChart: logsShowChart.value,
                sessionsShowMap: sessionsShowMap.value,
                sessionsShowChart: sessionsShowChart.value,
                homeShowAttackMap: homeShowAttackMap.value,
                homeShowSessionsMap: homeShowSessionsMap.value,
                dashboardSkin: dashboardSkin.value
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
        sessionsShowChart,
        homeShowAttackMap,
        homeShowSessionsMap,
        dashboardSkin
    };
});
