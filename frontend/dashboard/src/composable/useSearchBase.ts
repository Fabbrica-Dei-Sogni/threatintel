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

import { ref, watch, unref, isRef, type Ref } from 'vue';
import type { SortFields } from '../models/CommonDTO';
import { useSearchStore } from '../stores/searchPersistence';
import { useRoute } from 'vue-router';

interface UseSearchBaseOptions {
    fetchFn: () => Promise<void>;
    initialPage?: number | Ref<number>;
    initialPageSize?: number | Ref<number>;
    initialSortFields?: SortFields | Ref<SortFields | null>;
    filterRefs?: Ref<any>[]; // Riferimenti ai filtri da osservare
    debounceMs?: number;
    routeName?: string; // Nome della rotta per la persistenza
}

/**
 * Helper interno per garantire di avere un Ref legato all'input originale
 */
function linkRef<T>(input: T | Ref<T>, defaultValue: T): Ref<T> {
    if (isRef(input)) return input;
    return ref(input ?? defaultValue) as Ref<T>;
}

export function useSearchBase(options: UseSearchBaseOptions) {
    const {
        fetchFn,
        initialPage = 1,
        initialPageSize = 20,
        initialSortFields = {},
        filterRefs = [],
        debounceMs = 300,
        routeName
    } = options;

    const searchStore = useSearchStore();
    const route = useRoute();

    // Stato di base - LEGATO ai riferimenti passati (es. dallo store)
    const page = linkRef(initialPage, 1);
    const pageSize = linkRef(initialPageSize, 20);
    const sortFields = linkRef(initialSortFields, {} as SortFields);
    
    const total: Ref<number> = ref(0);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<any> = ref(null);

    // Funzione helper per salvare lo stato corrente nello store globale (routing persistence)
    const persistState = (filtersValues: any[]) => {
        const name = routeName || (route?.name as string);
        if (!name) return;

        const query: Record<string, any> = {
            page: page.value > 1 ? page.value : undefined,
            sortFields: sortFields.value && Object.keys(sortFields.value).length > 0 ? JSON.stringify(sortFields.value) : undefined,
        };

        if (name === 'ThreatLogs') {
            query.ip = filtersValues[0] || undefined;
            query.url = filtersValues[1] || undefined;
            query.protocol = filtersValues[2] !== 'http' ? filtersValues[2] : undefined;
        } else if (name === 'Attacks') {
            query.ip = filtersValues[0] || undefined;
            query.protocol = filtersValues[1] !== 'http' ? filtersValues[1] : undefined;
        } else if (name === 'CowrieSessions') {
            query.ip = filtersValues[0] || undefined;
            query.category = filtersValues[1] !== 'interaction' ? filtersValues[1] : undefined;
        } else if (name === 'Home') {
            query.attackProtocol = filtersValues[0] || undefined;
            query.logProtocol = filtersValues[1] || undefined;
            query.sessionCategory = filtersValues[2] || undefined;
        } else if (name === 'Campaigns') {
            query.minIps = filtersValues[0] > 1 ? filtersValues[0] : undefined;
            query.minScore = filtersValues[1] > 0 ? filtersValues[1] : undefined;
            query.minLogsPerIp = filtersValues[2] > 1 ? filtersValues[2] : undefined;
            query.protocol = filtersValues[3] !== 'http' ? filtersValues[3] : undefined;
            query.timeMode = filtersValues[4] !== 'ago' ? filtersValues[4] : undefined;
            query.agoValue = filtersValues[5] !== 7 ? filtersValues[5] : undefined;
            query.agoUnit = filtersValues[6] !== 'days' ? filtersValues[6] : undefined;
        }

        searchStore.saveQuery(name, query);
    };

    // Debouncing fetchData
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    function debouncedFetch() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchFn();
        }, debounceMs);
    }

    // Watcher unico per tutti i cambiamenti di stato (filtri, pagina, ordinamento)
    watch(
        [...filterRefs, page, pageSize, sortFields],
        (newVal, oldVal) => {
            if (!oldVal) {
                debouncedFetch();
                return;
            }

            const filtersChanged = filterRefs.some((_, i) => {
                const nv = newVal[i];
                const ov = oldVal[i];
                if (ov === undefined || ov === null) return false;
                if (typeof nv === 'object' && nv !== null) {
                    return JSON.stringify(nv) !== JSON.stringify(ov);
                }
                return nv !== ov;
            });

            if (filtersChanged && page.value !== 1) {
                page.value = 1;
                return;
            }

            persistState(newVal.slice(0, filterRefs.length));
            debouncedFetch();
        },
        { deep: true, immediate: true }
    );

    // Helpers per l'ordinamento
    function toggleSort(field: string) {
        const current = { ...(sortFields.value || {}) };
        if (current[field] === -1) {
            current[field] = 1;
        } else if (current[field] === 1) {
            delete current[field];
        } else {
            current[field] = -1;
        }
        sortFields.value = Object.keys(current).length > 0 ? current : null;
    }

    function getSortDirection(field: string): number | null {
        return sortFields.value ? (sortFields.value[field] || null) : null;
    }

    function getSortClass(field: string): string {
        const dir = getSortDirection(field);
        if (dir === -1) return 'sorted-desc';
        if (dir === 1) return 'sorted-asc';
        return '';
    }

    return {
        page,
        pageSize,
        sortFields,
        total,
        loading,
        error,
        debouncedFetch,
        toggleSort,
        getSortDirection,
        getSortClass
    };
}
