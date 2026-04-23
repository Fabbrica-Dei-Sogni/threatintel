import { defineStore } from 'pinia';
import { watch, reactive } from 'vue';
import { storage, StorageNamespace } from '../utils/storage';

export interface DashboardRankingsState {
    attackProtocol: string;
    logProtocol: string;
    sessionCategory: string;
    attackMinLogs: number;
    attackTimeValue: number | null;
    attackTimeUnit: string | null;
    dangerLevels: number[];
    attackPage: number;
    logPage: number;
    sessionPage: number;
}

export interface DashboardState {
    rankings: DashboardRankingsState;
    activeWidgets: string[];
    showTicker: boolean;
}

// Default dello stato per il cruscotto
const DEFAULT_STATE: DashboardState = {
    rankings: {
        attackProtocol: 'http',
        logProtocol: 'http',
        sessionCategory: 'interaction',
        attackMinLogs: 10,
        attackTimeValue: 10,
        attackTimeUnit: 'days',
        dangerLevels: [3],
        attackPage: 1,
        logPage: 1,
        sessionPage: 1
    },
    activeWidgets: [],
    showTicker: true
};

export const useDashboardStore = defineStore('dashboard', () => {
    // Carichiamo lo stato iniziale con i default
    const state = reactive<DashboardState>(JSON.parse(JSON.stringify(DEFAULT_STATE)));
    
    // Recuperiamo dal storage
    const saved = storage.get<DashboardState>(StorageNamespace.DASHBOARD);
    
    // Merge dei dati salvati sopra i default (Schema Migration)
    if (saved) {
        // Migration: se il valore salvato è il vecchio default di 90 giorni, forzalo a 10
        if (saved.rankings && saved.rankings.attackTimeValue === 90) {
            saved.rankings.attackTimeValue = 10;
        }
        if (saved.rankings) {
            Object.assign(state.rankings, saved.rankings);
        }
        if (saved.activeWidgets) {
            state.activeWidgets = saved.activeWidgets;
        }
        if (saved.showTicker !== undefined) {
            state.showTicker = saved.showTicker;
        }
    }

    // Watcher profondo per salvare automaticamente ogni cambiamento
    watch(state, (newState) => {
        storage.set(StorageNamespace.DASHBOARD, newState);
    }, { deep: true });

    // Helper per resettare ai default se necessario
    function resetToDefaults() {
        Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_STATE)));
    }

    function toggleWidget(widgetId: string) {
        if (state.activeWidgets.includes(widgetId)) {
            state.activeWidgets = state.activeWidgets.filter(w => w !== widgetId);
        } else {
            state.activeWidgets = [widgetId, ...state.activeWidgets];
        }
    }

    function isWidgetActive(widgetId: string) {
        return state.activeWidgets.includes(widgetId);
    }

    function toggleDefconLevel(lvl: number) {
        // Inizializzazione di emergenza se dangerLevels fosse undefined (vecchi dati)
        if (!state.rankings.dangerLevels) {
            state.rankings.dangerLevels = [];
        }
        const current = state.rankings.dangerLevels;
        const index = current.indexOf(lvl);
        if (index === -1) {
            current.push(lvl);
        } else {
            current.splice(index, 1);
        }
    }

    // Reset specifici per contesto
    function resetAttacks() {
        state.rankings.attackProtocol = DEFAULT_STATE.rankings.attackProtocol;
        state.rankings.attackMinLogs = DEFAULT_STATE.rankings.attackMinLogs;
        state.rankings.attackTimeValue = DEFAULT_STATE.rankings.attackTimeValue;
        state.rankings.attackTimeUnit = DEFAULT_STATE.rankings.attackTimeUnit;
        state.rankings.dangerLevels = [...DEFAULT_STATE.rankings.dangerLevels];
        state.rankings.attackPage = 1;
    }

    function resetLogs() {
        state.rankings.logProtocol = DEFAULT_STATE.rankings.logProtocol;
        state.rankings.logPage = 1;
    }

    function resetSessions() {
        state.rankings.sessionCategory = DEFAULT_STATE.rankings.sessionCategory;
        state.rankings.sessionPage = 1;
    }

    return {
        state,
        resetToDefaults,
        resetAttacks,
        resetLogs,
        resetSessions,
        toggleWidget,
        isWidgetActive,
        toggleDefconLevel
    };
});
