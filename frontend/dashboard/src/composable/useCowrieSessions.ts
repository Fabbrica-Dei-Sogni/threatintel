// src/composable/useCowrieSessions.ts
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import { fetchCowrieSessions } from '../api';
import type { CowrieSession, FetchCowrieSessionsResponse } from '../models/CowrieDTO';

export function useCowrieSessions(
    initialPage: number = 1,
    initialLimit: number = 20,
    initialSortFields: any = {},
    initialIp: string = ''
) {
    const sessions: Ref<CowrieSession[]> = ref([]);
    const page: Ref<number> = ref(initialPage);
    const pageSize: Ref<number> = ref(initialLimit);
    const sortFields: Ref<any> = ref(initialSortFields);
    const filterIp: Ref<string> = ref(initialIp);
    const total: Ref<number> = ref(0);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    // Debounced fetchData
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function debouncedFetch() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchData();
        }, 300);
    }

    async function fetchData(): Promise<void> {
        // Evitiamo chiamate multiple se già in caricamento
        if (loading.value) return;
        
        loading.value = true;
        error.value = null;
        try {
            const filters: any = {};
            if (filterIp.value) filters.src_ip = filterIp.value;

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

    // Definiamo i campi che costituiscono un filtro
    const filterRefs = [filterIp];

    watch(
        [...filterRefs, page, pageSize, sortFields],
        (newVal: any[], oldVal: any[]) => {
            // Verifichiamo se è cambiato il filtro IP (primo elemento)
            const filtersChanged = filterRefs.some((_, i) => newVal[i] !== oldVal[i]);
            
            if (filtersChanged && page.value !== 1) {
                page.value = 1;
                return;
            }
            
            debouncedFetch();
        },
        { deep: true, immediate: true }
    );

    function toggleSort(field: string): void {
        const currentDirection = sortFields.value?.[field];
        const newSort = { ...(sortFields.value || {}) };

        if (currentDirection === undefined) {
            newSort[field] = 1;
        } else if (currentDirection === 1) {
            newSort[field] = -1;
        } else {
            delete newSort[field];
        }
        
        sortFields.value = Object.keys(newSort).length ? newSort : null;
        // fetchData() verrà chiamato dal watcher di sortFields
    }

    function getSortDirection(field: string): number {
        return sortFields.value?.[field] || 0;
    }

    function onFilterChanged(): void {
        // Il watcher gestirà tutto
    }

    return {
        sessions,
        page,
        pageSize,
        sortFields,
        filterIp,
        total,
        loading,
        error,
        fetchData,
        onFilterChanged,
        toggleSort,
        getSortDirection
    };
}
