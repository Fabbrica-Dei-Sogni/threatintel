// src/composable/useCowrieSessions.ts
import { ref } from 'vue';
import { fetchCowrieSessions } from '../api';
import type { CowrieSession, FetchCowrieSessionsResponse } from '../models/CowrieDTO';
import { useSearchBase } from './useSearchBase';

export function useCowrieSessions(
    initialPage: number = 1,
    initialLimit: number = 20,
    initialSortFields: any = {},
    initialIp: string = '',
    initialCategory: string = 'interaction'
) {
    // Filtri specifici
    const filterIp = ref(initialIp);
    const filterCategory = ref<string>(initialCategory);
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
        initialPageSize: initialLimit,
        initialSortFields,
        filterRefs: [filterIp, filterCategory]
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
