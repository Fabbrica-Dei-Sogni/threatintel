// src/composables/useLogsFilter.ts
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { } from '../models/CommonDTO.ts'
import { fetchSearch } from '../api/index.js';
import type { SortFields } from '../models/CommonDTO';
import type { FetchSearchParams, FetchSearchResponse, Log } from '@/models/LogDTO.ts';



export function useLogsFilter(
    initialIp: string = '',
    initialUrl: string = '',
    initialProtocol: string = 'http',
    initialPage: number = 1,
    initialSortFields: SortFields | null = null
) {
    // Reattivi
    const filterIp: Ref<string> = ref(initialIp);
    const filterUrl: Ref<string> = ref(initialUrl);
    const filterProtocol: Ref<string> = ref(initialProtocol);
    const page: Ref<number> = ref(initialPage);
    const pageSize: Ref<number> = ref(20);
    const logs: Ref<Log[]> = ref([]);
    const total: Ref<number> = ref(0);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<boolean> = ref(false);
    const filterTimer: Ref<ReturnType<typeof setTimeout> | null> = ref(null);
    const sortFields: Ref<SortFields> = ref(initialSortFields ?? {});

    // Funzione per recuperare dati
    async function fetchData(): Promise<void> {
        if (loading.value) return; 

        loading.value = true;
        error.value = false;

        try {
            const filters: Record<string, string> = {};
            if (filterIp.value) filters['request.ip'] = filterIp.value;
            if (filterUrl.value) filters['request.url'] = filterUrl.value;
            if (filterProtocol.value) filters['protocol'] = filterProtocol.value;

            const params: FetchSearchParams = {
                page: page.value,
                pageSize: pageSize.value,
                filters,
                sortFields: Object.keys(sortFields.value).length > 0 ? sortFields.value : null
            };

            const data: FetchSearchResponse = await fetchSearch(params);

            logs.value = data.logs;
            total.value = data.total;
        } catch (err) {
            error.value = true;
            logs.value = [];
            total.value = 0;
        } finally {
            loading.value = false;
        }
    }

    // Debounced fetchData
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function debouncedFetch() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchData();
        }, 300);
    }

    // Unico watcher per tutti i cambiamenti di stato
    // Definiamo i campi che costituiscono un filtro per gestire il reset della pagina
    const filterRefs = [filterIp, filterUrl, filterProtocol];

    watch(
        [...filterRefs, page, sortFields],
        (newVal: any[], oldVal: any[]) => {
            // Verifichiamo se è cambiato uno dei filtri (primi 3 elementi)
            const filtersChanged = filterRefs.some((_, i) => newVal[i] !== oldVal[i]);
            
            if (filtersChanged && page.value !== 1) {
                page.value = 1;
                // fetchData verrà chiamato dal prossimo ciclo generato dal cambio di page
                return;
            }
            
            debouncedFetch();
        },
        { deep: true, immediate: true }
    );

    // Filter input handler (ora può essere vuoto o rimosso, 
    // ma lo teniamo per compatibilità se chiamato esplicitamente)
    function onFilterChanged(): void {
        // Il watcher gestirà tutto
    }

    // Toggle sorting order for a field
    function toggleSort(field: string): void {
        const newSort = { ...sortFields.value };
        const currentDirection = newSort[field];

        if (currentDirection === undefined) {
            // Aggiunge in coda se nuovo
            newSort[field] = 1;
        } else if (currentDirection === 1) {
            // Inverte la direzione nello stesso posto
            newSort[field] = -1;
        } else {
            // Rimuove il campo
            delete newSort[field];
        }
        
        sortFields.value = newSort;
        // fetchData() verrà chiamato automaticamente dal watcher di sortFields
    }

    // Get current sort direction for a field
    function getSortDirection(field: string): number {
        return sortFields.value[field] || 0;
    }

    function getSortClass(field: string): string {
        const dir = getSortDirection(field);
        if (dir === 1) return 'sorted-asc';
        if (dir === -1) return 'sorted-desc';
        return '';
    }

    return {
        filterIp,
        filterUrl,
        filterProtocol,
        sortFields,
        page,
        pageSize,
        logs,
        total,
        loading,
        error,
        fetchData,
        onFilterChanged,
        toggleSort,
        getSortDirection,
        getSortClass,
    };
}
