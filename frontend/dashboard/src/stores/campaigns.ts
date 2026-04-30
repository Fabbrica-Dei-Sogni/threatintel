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
    selectedUris: string[];
    search: string;
    minCorrelations: number;
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
        minCorrelations: number;
        maxCorrelations: number;
        minDate: string | null;
        maxDate: string | null;
        globalMinDate: string | null;
        globalMaxDate: string | null;
    };
    targetedIps: Record<string, string[]>;
    uiState: Record<string, {
        showChart: boolean;
        showHub: boolean;
    }>;
    uriBrowser: {
        page: number;
        pageSize: number;
        sortBy: 'count' | 'uri' | 'logs';
        order: -1 | 1;
    };
}

const DEFAULT_STATE: CampaignsState = {
    filters: {
        minIps: 1,
        minScore: 0,
        minLogsPerIp: 1,
        minCorrelations: 0,
        protocol: 'http',
        timeMode: 'ago',
        agoValue: 7,
        agoUnit: 'days',
        startDate: null,
        endDate: null,
        selectedUris: [],
        search: ''
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
        minCorrelations: 0,
        maxCorrelations: 10,
        minDate: null,
        maxDate: null,
        globalMinDate: null,
        globalMaxDate: null
    },
    targetedIps: {},
    uiState: {},
    uriBrowser: {
        page: 1,
        pageSize: 10,
        sortBy: 'count',
        order: -1
    }
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

    function setTargetedIps(hash: string, ips: string[]) {
        state.targetedIps[hash] = [...ips];
    }

    function getUiState(hash: string) {
        if (!state.uiState[hash]) {
            state.uiState[hash] = { showChart: false, showHub: false };
        }
        return state.uiState[hash];
    }

    function updateUiState(hash: string, updates: Partial<{ showChart: boolean; showHub: boolean }>) {
        if (!state.uiState[hash]) {
            state.uiState[hash] = { showChart: false, showHub: false };
        }
        Object.assign(state.uiState[hash], updates);
    }

    function getTargetedIps(hash: string): string[] {
        return state.targetedIps[hash] || [];
    }

    function toggleUri(uri: string) {
        const index = state.filters.selectedUris.indexOf(uri);
        if (index === -1) {
            state.filters.selectedUris.push(uri);
        } else {
            state.filters.selectedUris.splice(index, 1);
        }
        state.pagination.page = 1;
    }

    function clearUris() {
        state.filters.selectedUris = [];
        state.pagination.page = 1;
    }

    function updateUriBrowser(updates: Partial<CampaignsState['uriBrowser']>) {
        Object.assign(state.uriBrowser, updates);
    }

    return {
        state,
        resetFilters,
        toggleTargetedIp,
        clearTargetedIps,
        setTargetedIps,
        getUiState,
        updateUiState,
        getTargetedIps,
        toggleUri,
        clearUris,
        updateUriBrowser
    };
});
