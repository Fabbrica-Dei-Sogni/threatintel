import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { storage, StorageNamespace } from '../utils/storage';

export const useViewSettingsStore = defineStore('viewSettings', () => {
    // Carichiamo lo stato iniziale usando il gestore centralizzato
    const savedSettings = storage.get<any>(StorageNamespace.SETTINGS) || {};

    // Attacks View
    const attacksShowMap = ref<boolean>(savedSettings.attacksShowMap ?? false);
    const attacksShowChart = ref<boolean>(savedSettings.attacksShowChart ?? true);

    // Home Dashboard (Persistent Maps & Skin)
    const homeShowAttackMap = ref<boolean>(savedSettings.homeShowAttackMap ?? false);
    const homeShowSessionsMap = ref<boolean>(savedSettings.homeShowSessionsMap ?? false);
    const dashboardSkin = ref<string>(savedSettings.dashboardSkin ?? 'cyber');
    const userLocale = ref<string>(savedSettings.userLocale ?? 'it-IT');
    
    // NOTA: activeWidgets è stato spostato in dashboardStore per coerenza con il cruscotto stateful
    // ma lo manteniamo qui come fallback o alias se necessario per compatibilità.
    const activeWidgets = ref<string[]>(savedSettings.activeWidgets ?? ['telemetries', 'attacks', 'logs']);

    // Telemetry Specific Filters (Questi potrebbero migrare in un useTelemetryStore futuro)
    const telemetryTimeframe = ref<string>(savedSettings.telemetryTimeframe ?? '24h');
    const telemetryScore = ref<number>(savedSettings.telemetryScore ?? 15);
    const telemetryLevel = ref<string>(savedSettings.telemetryLevel ?? 'low');
    const telemetryTop = ref<string>(savedSettings.telemetryTop ?? 'all');
    const telemetryMinLogs = ref<number>(savedSettings.telemetryMinLogs ?? 10);

    // Salvataggio automatico centralizzato
    watch(
        [
            attacksShowMap, attacksShowChart,
            homeShowAttackMap, homeShowSessionsMap, dashboardSkin, userLocale, activeWidgets,
            telemetryTimeframe, telemetryScore, telemetryLevel, telemetryTop, telemetryMinLogs
        ],
        () => {
            const settings = {
                attacksShowMap: attacksShowMap.value,
                attacksShowChart: attacksShowChart.value,
                homeShowAttackMap: homeShowAttackMap.value,
                homeShowSessionsMap: homeShowSessionsMap.value,
                dashboardSkin: dashboardSkin.value,
                userLocale: userLocale.value,
                activeWidgets: activeWidgets.value,
                telemetryTimeframe: telemetryTimeframe.value,
                telemetryScore: telemetryScore.value,
                telemetryLevel: telemetryLevel.value,
                telemetryTop: telemetryTop.value,
                telemetryMinLogs: telemetryMinLogs.value
            };
            storage.set(StorageNamespace.SETTINGS, settings);
        },
        { deep: true }
    );

    return {
        attacksShowMap,
        attacksShowChart,
        homeShowAttackMap,
        homeShowSessionsMap,
        dashboardSkin,
        userLocale,
        activeWidgets,
        telemetryTimeframe,
        telemetryScore,
        telemetryLevel,
        telemetryTop,
        telemetryMinLogs
    };
});

