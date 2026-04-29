import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import { storage, StorageNamespace } from '../utils/storage';

export interface CampaignsFilters {
    minIps: number;
    minScore: number;
    minLogsPerIp: number;
    protocol: string;
    timeMode: 'ago' | 'range';
    agoValue: number;
    agoUnit: 'minutes' | 'hours' | 'days' | 'months' | 'years';
    startDate: string | null;
    endDate: string | null;
}

export interface CampaignsState {
    filters: CampaignsFilters;
    pagination: {
        page: number;
        pageSize: number;
    };
    sorting: {
        field: string;
        order: number;
    };
    metadata: {
        minIpCount: number;
        maxIpCount: number;
        minScore: number;
        maxScore: number;
        minLogsPerIp: number;
        maxLogsPerIp: number;
        minDate: string | null;
        maxDate: string | null;
        globalMinDate: string | null;
        globalMaxDate: string | null;
    };
    targetedIps: Record<string, string[]>;
}

const DEFAULT_STATE: CampaignsState = {
    filters: {
        minIps: 1,
        minScore: 0,
        minLogsPerIp: 1,
        protocol: 'http',
        timeMode: 'ago',
        agoValue: 7,
        agoUnit: 'days',
        startDate: null,
        endDate: null
    },
    pagination: {
        page: 1,
        pageSize: 10
    },
    sorting: {
        field: 'ipCount',
        order: -1
    },
    metadata: {
        minIpCount: 2,
        maxIpCount: 10,
        minScore: 0,
        maxScore: 100,
        minLogsPerIp: 1,
        maxLogsPerIp: 10,
        minDate: null,
        maxDate: null,
        globalMinDate: null,
        globalMaxDate: null
    },
    targetedIps: {}
};

export const useCampaignsStore = defineStore('campaigns', () => {
    const state = reactive<CampaignsState>(JSON.parse(JSON.stringify(DEFAULT_STATE)));

    // Caricamento dallo storage persistente
    const saved = storage.get<CampaignsState>(StorageNamespace.CAMPAIGNS);
    if (saved) {
        if (saved.filters) Object.assign(state.filters, saved.filters);
        if (saved.sorting) Object.assign(state.sorting, saved.sorting);
        if (saved.targetedIps) Object.assign(state.targetedIps, saved.targetedIps);
    }

    // Salvataggio automatico
    watch(state, (newState) => {
        storage.set(StorageNamespace.CAMPAIGNS, newState);
    }, { deep: true });

    function resetFilters() {
        Object.assign(state.filters, JSON.parse(JSON.stringify(DEFAULT_STATE.filters)));
        state.pagination.page = 1;
    }

    function toggleTargetedIp(hash: string, ip: string) {
        if (!state.targetedIps[hash]) {
            state.targetedIps[hash] = [];
        }
        const index = state.targetedIps[hash].indexOf(ip);
        if (index === -1) {
            state.targetedIps[hash].push(ip);
        } else {
            state.targetedIps[hash].splice(index, 1);
        }
    }

    function clearTargetedIps(hash: string) {
        state.targetedIps[hash] = [];
    }

    function getTargetedIps(hash: string): string[] {
        return state.targetedIps[hash] || [];
    }

    return {
        state,
        resetFilters,
        toggleTargetedIp,
        clearTargetedIps,
        getTargetedIps
    };
});
