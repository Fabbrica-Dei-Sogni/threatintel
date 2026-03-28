// src/composables/useLogsFilter.ts
import { ref } from 'vue';
import { fetchSearch } from '../api/index.js';
import type { SortFields } from '../models/CommonDTO';
import type { FetchSearchParams, FetchSearchResponse, Log } from '@/models/LogDTO.ts';
import { useSearchBase } from './useSearchBase';

export function useLogsFilter(
    initialIp: string = '',
    initialUrl: string = '',
    initialProtocol: string = 'http',
    initialPage: number = 1,
    initialSortFields: SortFields | null = null
) {
    // Filtri specifici
    const filterIp = ref(initialIp);
    const filterUrl = ref(initialUrl);
    const filterProtocol = ref(initialProtocol);
    const logs = ref<Log[]>([]);

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
        initialSortFields: initialSortFields ?? { timestamp: -1 },
        filterRefs: [filterIp, filterUrl, filterProtocol]
    });

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
                sortFields: Object.keys(sortFields.value || {}).length > 0 ? sortFields.value : null
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
        fetchData, // Mantenuto per chiamate manuali se necessario
        onFilterChanged: () => {}, // Mock per compatibilità legacy
        toggleSort,
        getSortDirection,
        getSortClass,
    };
}
