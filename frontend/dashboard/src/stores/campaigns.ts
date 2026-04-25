import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import { storage, StorageNamespace } from '../utils/storage';

export interface CampaignsFilters {
    minIps: number;
    minScore: number;
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
    };
}

const DEFAULT_STATE: CampaignsState = {
    filters: {
        minIps: 2,
        minScore: 0,
        protocol: 'http',
        timeMode: 'ago',
        agoValue: 30,
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
        maxScore: 100
    }
};

export const useCampaignsStore = defineStore('campaigns', () => {
    const state = reactive<CampaignsState>(JSON.parse(JSON.stringify(DEFAULT_STATE)));

    // Caricamento dallo storage persistente
    const saved = storage.get<CampaignsState>(StorageNamespace.CAMPAIGNS);
    if (saved) {
        if (saved.filters) Object.assign(state.filters, saved.filters);
        if (saved.sorting) Object.assign(state.sorting, saved.sorting);
        // La paginazione di solito non la persistiamo tra le sessioni per evitare confusione
    }

    // Salvataggio automatico
    watch(state, (newState) => {
        storage.set(StorageNamespace.CAMPAIGNS, newState);
    }, { deep: true });

    function resetFilters() {
        Object.assign(state.filters, JSON.parse(JSON.stringify(DEFAULT_STATE.filters)));
        state.pagination.page = 1;
    }

    return {
        state,
        resetFilters
    };
});
