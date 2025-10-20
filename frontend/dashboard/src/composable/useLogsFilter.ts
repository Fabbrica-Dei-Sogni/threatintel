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
    initialPage: number = 1,
    initialSortFields: SortFields | null = null
) {
    // Reattivi
    const filterIp: Ref<string> = ref(initialIp);
    const filterUrl: Ref<string> = ref(initialUrl);
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
        loading.value = true;
        error.value = false;

        try {
            const filters: Record<string, string> = {};
            if (filterIp.value) filters['request.ip'] = filterIp.value;
            if (filterUrl.value) filters['request.url'] = filterUrl.value;

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

    // Watchers
    watch([filterIp, filterUrl], () => {
        //page.value = 1;
        fetchData();
    });

    watch(page, () => {
        fetchData();
    });

    // Debounced filter input handler
    function onFilterChanged(resetPage = true): void {
        if (filterTimer.value) {
            clearTimeout(filterTimer.value);
        }
        filterTimer.value = setTimeout(() => {
            if (resetPage) {
            page.value = 1;
            }
            fetchData();
        }, 400);
    }

    // Toggle sorting order for a field
    function toggleSort(field: string): void {
        const currentDirection = sortFields.value[field];

        if (currentDirection === undefined) {
            // Add ascending sort
            sortFields.value = { ...sortFields.value, [field]: 1 };
        } else if (currentDirection === 1) {
            // Change to descending
            sortFields.value = { ...sortFields.value, [field]: -1 };
        } else {
            // Remove sort
            const newSort = { ...sortFields.value };
            delete newSort[field];
            sortFields.value = Object.keys(newSort).length ? newSort : {};
        }
        // Sorting does not reset the page number
        // page.value = 1;
        fetchData();
    }

    // Get current sort direction for a field
    function getSortDirection(field: string): number {
        return sortFields.value[field] || 0;
    }

    return {
        filterIp,
        filterUrl,
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
    };
}
