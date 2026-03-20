// src/composable/useCowrieSessions.ts
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import { fetchCowrieSessions } from '../api';
import type { CowrieSession, FetchCowrieSessionsResponse } from '../models/CowrieDTO';

export function useCowrieSessions(
    initialPage: number = 1,
    initialLimit: number = 20
) {
    const sessions: Ref<CowrieSession[]> = ref([]);
    const page: Ref<number> = ref(initialPage);
    const limit: Ref<number> = ref(initialLimit);
    const totalPages: Ref<number> = ref(1);
    const total: Ref<number> = ref(0);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    async function fetchData(): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response: FetchCowrieSessionsResponse = await fetchCowrieSessions(page.value, limit.value);
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

    return {
        sessions,
        page,
        limit,
        totalPages,
        total,
        loading,
        error,
        fetchData
    };
}
