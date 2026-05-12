/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

import { defineStore } from 'pinia';
import { watch, reactive } from 'vue';
import { storage, StorageNamespace } from '../utils/storage';
import type { SortFields } from '../models/CommonDTO';

export interface ThreatLogsState {
    filters: {
        ip: string;
        url: string;
        protocol: string;
        status: string;
        userAgent: string;
    };
    pagination: {
        page: number;
        pageSize: number;
    };
    sort: {
        fields: SortFields;
    };
    view: {
        showChart: boolean;
    };
}

const DEFAULT_STATE: ThreatLogsState = {
    filters: {
        ip: '',
        url: '',
        protocol: 'http',
        status: 'active',
        userAgent: ''
    },
    pagination: {
        page: 1,
        pageSize: 20
    },
    sort: {
        fields: { timestamp: -1 }
    },
    view: {
        showChart: false
    }
};

export const useThreatLogsStore = defineStore('threatlogs', () => {
    const state = reactive<ThreatLogsState>(JSON.parse(JSON.stringify(DEFAULT_STATE)));
    
    const saved = storage.get<ThreatLogsState>(StorageNamespace.THREAT_LOGS);
    
    if (saved) {
        if (saved.filters) Object.assign(state.filters, saved.filters);
        if (saved.pagination) Object.assign(state.pagination, saved.pagination);
        if (saved.sort) Object.assign(state.sort, saved.sort);
        if (saved.view) Object.assign(state.view, saved.view);
    }

    watch(state, (newState) => {
        storage.set(StorageNamespace.THREAT_LOGS, newState);
    }, { deep: true });

    function resetToDefaults() {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_STATE));
        // Eseguiamo il merge dei singoli oggetti per preservare i riferimenti
        Object.assign(state.filters, defaults.filters);
        Object.assign(state.pagination, defaults.pagination);
        Object.assign(state.sort, defaults.sort);
        Object.assign(state.view, defaults.view);
    }

    function toggleChart() {
        state.view.showChart = !state.view.showChart;
    }

    return {
        state,
        resetToDefaults,
        toggleChart
    };
});
