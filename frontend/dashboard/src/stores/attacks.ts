import { defineStore } from 'pinia';
import { watch, reactive } from 'vue';
import { storage, StorageNamespace } from '../utils/storage';
import type { SortFields } from '../models/CommonDTO';

export interface AttacksState {
    filters: {
        ip: string;
        protocol: string;
        minLogs: number;
        timeMode: 'ago' | 'range';
        agoValue: number;
        agoUnit: string;
        dateRange: [string | null, string | null] | null;
        fromValue: number;
        fromUnit: string;
        toValue: number;
        toUnit: string;
        dangerLevels: number[];
        attackPatterns: string;
        userAgent: string;
        status: string;
    };
    pagination: {
        page: number;
        pageSize: number;
    };
    sort: {
        fields: SortFields;
    };
    view: {
        showMap: boolean;
        showChart: boolean;
        viewMode: 'table' | 'grid';
    };
}

const DEFAULT_STATE: AttacksState = {
    filters: {
        ip: '',
        protocol: 'http',
        minLogs: 10,
        timeMode: 'ago',
        agoValue: 10,
        agoUnit: 'days',
        dateRange: [null, null],
        fromValue: 60,
        fromUnit: 'days',
        toValue: 0,
        toUnit: 'days',
        dangerLevels: [3],
        attackPatterns: '',
        userAgent: '',
        status: 'active'
    },
    pagination: {
        page: 1,
        pageSize: 20
    },
    sort: {
        fields: { firstSeen: -1 }
    },
    view: {
        showMap: false,
        showChart: false,
        viewMode: 'table'
    }
};

export const useAttacksStore = defineStore('attacks', () => {
    const state = reactive<AttacksState>(JSON.parse(JSON.stringify(DEFAULT_STATE)));
    
    const saved = storage.get<AttacksState>(StorageNamespace.ATTACKS);
    
    if (saved) {
        // Migration: se il valore salvato è il vecchio default di 90 giorni, forzalo a 10
        if (saved.filters && saved.filters.agoValue === 90) {
            saved.filters.agoValue = 10;
        }
        if (saved.filters) Object.assign(state.filters, saved.filters);
        if (saved.pagination) Object.assign(state.pagination, saved.pagination);
        if (saved.view) Object.assign(state.view, saved.view);
        if (saved.sort) Object.assign(state.sort, saved.sort);
    }

    watch(state, (newState) => {
        storage.set(StorageNamespace.ATTACKS, newState);
    }, { deep: true });

    function resetToDefaults() {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_STATE));
        // Eseguiamo il merge dei singoli oggetti per preservare i riferimenti usati dai toRef
        Object.assign(state.filters, defaults.filters);
        Object.assign(state.pagination, defaults.pagination);
        Object.assign(state.sort, defaults.sort);
        Object.assign(state.view, defaults.view);
    }

    function toggleMap() {
        state.view.showMap = !state.view.showMap;
    }

    function toggleChart() {
        state.view.showChart = !state.view.showChart;
    }

    function toggleDangerLevel(lvl: number) {
        const current = state.filters.dangerLevels;
        const index = current.indexOf(lvl);
        if (index === -1) {
            current.push(lvl);
        } else {
            current.splice(index, 1);
        }
    }

    return {
        state,
        resetToDefaults,
        toggleMap,
        toggleChart,
        toggleDangerLevel
    };
});
