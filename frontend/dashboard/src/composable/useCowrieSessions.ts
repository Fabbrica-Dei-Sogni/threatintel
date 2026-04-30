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

// src/composable/useCowrieSessions.ts
import { ref, isRef, type Ref } from 'vue';
import { fetchCowrieSessions } from '../api';
import type { CowrieSession, FetchCowrieSessionsResponse } from '../models/CowrieDTO';
import { useSearchBase } from './useSearchBase';

/**
 * Helper per normalizzare un input che può essere un valore semplice o un Ref
 */
function toRef<T>(val: T | Ref<T>): Ref<T> {
    return isRef(val) ? val : ref(val) as Ref<T>;
}

export function useCowrieSessions(
    initialPage: number | Ref<number> = 1,
    initialPageSize: number | Ref<number> = 20,
    initialSortFields: any | Ref<any> = {},
    initialIp: string | Ref<string> = '',
    initialCategory: string | Ref<string> = 'interaction'
) {
    // Filtri specifici - Normalizzati come Ref
    const filterIp = toRef(initialIp);
    const filterCategory = toRef(initialCategory);
    const sessions = ref<CowrieSession[]>([]);

    // Integrazione useSearchBase
    const {
        page,
        pageSize,
        sortFields,
        total,
        loading,
        error,
        toggleSort,
        getSortDirection,
        getSortClass,
        debouncedFetch
    } = useSearchBase({
        fetchFn: fetchData,
        initialPage,
        initialPageSize,
        initialSortFields: initialSortFields || { starttime: -1 },
        filterRefs: [filterIp, filterCategory],
        routeName: 'CowrieSessions'
    });

    async function fetchData(): Promise<void> {
        if (loading.value) return;
        
        loading.value = true;
        error.value = null;
        try {
            const filters: any = {};
            if (filterIp.value) filters.src_ip = filterIp.value;
            // 'all' non viene inviato: il backend restituisce tutte le sessioni
            // quando sessionCategory è assente (equivalente all'ex stringa vuota)
            if (filterCategory.value && filterCategory.value !== 'all') filters.sessionCategory = filterCategory.value;

            const response: FetchCowrieSessionsResponse = await fetchCowrieSessions(
                page.value, 
                pageSize.value, 
                sortFields.value,
                filters
            );
            sessions.value = response.sessions || [];
            total.value = response.total || 0;
        } catch (err) {
            error.value = "error_fetching_sessions";
            console.error('Error fetching cowrie sessions:', err);
        } finally {
            loading.value = false;
        }
    }

    return {
        sessions,
        page,
        pageSize,
        sortFields,
        filterIp,
        filterCategory,
        total,
        loading,
        error,
        fetchData,
        onFilterChanged: () => {},
        toggleSort,
        getSortDirection,
        getSortClass
    };
}
