// src/composable/useCowrieSessions.ts
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import { fetchCowrieSessions } from '../api';
import type { CowrieSession, FetchCowrieSessionsResponse } from '../models/CowrieDTO';

export function useCowrieSessions(
    initialPage: number = 1,
    initialLimit: number = 20,
    initialSortFields: any = { timestamp: -1 }
) {
    const sessions: Ref<CowrieSession[]> = ref([]);
    const page: Ref<number> = ref(initialPage);
    const limit: Ref<number> = ref(initialLimit);
    const sortFields: Ref<any> = ref(initialSortFields);
    const totalPages: Ref<number> = ref(1);
    const total: Ref<number> = ref(0);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    async function fetchData(): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response: FetchCowrieSessionsResponse = await fetchCowrieSessions(
                page.value, 
                limit.value, 
                sortFields.value
            );
            sessions.value = response.data || [];
            total.value = response.total || 0;
            totalPages.value = response.totalPages || 1;
        } catch (err) {
            error.value = "Failed to load Telnet sessions. Ensure the backend is running.";
            console.error('Error fetching cowrie sessions:', err);
        } finally {
            loading.value = false;
        }
    }

    watch(page, () => {
        fetchData();
    });

    watch(limit, () => {
        page.value = 1;
        fetchData();
    });

    watch(sortFields, () => {
        // page.value = 1; // Uncommment if you want to reset page on sort
        fetchData();
    });

    function toggleSort(field: string): void {
        const currentDirection = sortFields.value?.[field];

        if (currentDirection === undefined) {
            sortFields.value = { [field]: 1 }; // Replace other sorts for simplicity, or merge
        } else if (currentDirection === 1) {
            sortFields.value = { [field]: -1 };
        } else {
            sortFields.value = { timestamp: -1 }; // Reset to default
        }
        fetchData();
    }

    function getSortDirection(field: string): number {
        return sortFields.value?.[field] || 0;
    }

    return {
        sessions,
        page,
        limit,
        sortFields,
        totalPages,
        total,
        loading,
        error,
        fetchData,
        toggleSort,
        getSortDirection
    };
}
