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

export interface CowrieSessionsState {
    filters: {
        ip: string;
        category: string;
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
    };
}

const DEFAULT_STATE: CowrieSessionsState = {
    filters: {
        ip: '',
        category: 'interaction'
    },
    pagination: {
        page: 1,
        pageSize: 20
    },
    sort: {
        fields: { starttime: -1 }
    },
    view: {
        showMap: false,
        showChart: false
    }
};

export const useCowrieSessionsStore = defineStore('cowriesessions', () => {
    const state = reactive<CowrieSessionsState>(JSON.parse(JSON.stringify(DEFAULT_STATE)));
    
    const saved = storage.get<CowrieSessionsState>(StorageNamespace.COWRIE_SESSIONS);
    
    if (saved) {
        if (saved.filters) Object.assign(state.filters, saved.filters);
        if (saved.pagination) Object.assign(state.pagination, saved.pagination);
        if (saved.sort) Object.assign(state.sort, saved.sort);
        if (saved.view) Object.assign(state.view, saved.view);
    }

    watch(state, (newState) => {
        storage.set(StorageNamespace.COWRIE_SESSIONS, newState);
    }, { deep: true });

    function resetToDefaults() {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_STATE));
        Object.assign(state.filters, defaults.filters);
        Object.assign(state.pagination, defaults.pagination);
        Object.assign(state.sort, defaults.sort);
        Object.assign(state.view, defaults.view);
    }

    return {
        state,
        resetToDefaults
    };
});
