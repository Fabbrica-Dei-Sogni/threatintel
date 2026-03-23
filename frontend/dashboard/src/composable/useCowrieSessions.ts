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

    const filterTimer = ref<ReturnType<typeof setTimeout> | null>(null);

    async function fetchData(): Promise<void> {
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

    watch([page, pageSize, sortFields], () => {
        fetchData();
    });

    watch(filterIp, () => {
        onFilterChanged();
    });

    function onFilterChanged(resetPage: boolean = true): void {
        if (filterTimer.value) clearTimeout(filterTimer.value);
        filterTimer.value = setTimeout(() => {
            if (resetPage) page.value = 1;
            fetchData();
        }, 400);
    }

    function toggleSort(field: string): void {
        const currentDirection = sortFields.value?.[field];

        if (currentDirection === undefined) {
            sortFields.value = { ...sortFields.value, [field]: 1 };
        } else if (currentDirection === 1) {
            sortFields.value = { ...sortFields.value, [field]: -1 };
        } else {
            const newSort = { ...sortFields.value };
            delete newSort[field];
            sortFields.value = Object.keys(newSort).length ? newSort : null;
        }
        fetchData();
    }

    function getSortDirection(field: string): number {
        return sortFields.value?.[field] || 0;
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
