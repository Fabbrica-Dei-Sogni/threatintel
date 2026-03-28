// src/composables/useAttacksFilter.ts
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import { fetchAttackSearch } from '../api/index.js';
import type { SortFields, TimeConfig } from '../models/CommonDTO';
import type { AttackLog, FetchAttackSearchParams, FetchAttackSearchResponse } from '@/models/AttackDTO.js';

export function useAttacksFilter(
    initialIp: string,
    initialProtocol: string = 'http',
    initialPage: number,
    initialMinLogsForAttack: number,
    initialTimeMode: 'ago' | 'range',
    initialAgoValue: number,
    initialAgoUnit: string,
    initialDateRange: [string | null, string | null] | null,
    initialFromValue: number,
    initialFromUnit: string,
    initialToValue: number,
    initialToUnit: string,
    initialSortFields: SortFields = null
) {
    const attacks: Ref<AttackLog[]> = ref([]);
    const filterIp: Ref<string> = ref(initialIp);
    const filterProtocol: Ref<string> = ref(initialProtocol);
    const minLogsForAttack: Ref<number> = ref(initialMinLogsForAttack);
    const page: Ref<number> = ref(initialPage);

    const timeMode: Ref<'ago' | 'range'> = ref(initialTimeMode);
    const agoValue: Ref<number> = ref(initialAgoValue);
    const agoUnit: Ref<string> = ref(initialAgoUnit);
    const dateRange: Ref<[string | null, string | null] | null> = ref(initialDateRange);
    const fromValue: Ref<number> = ref(initialFromValue);
    const fromUnit: Ref<string> = ref(initialFromUnit);
    const toValue: Ref<number> = ref(initialToValue);
    const toUnit: Ref<string> = ref(initialToUnit);

    const loading: Ref<boolean> = ref(false);
    const error: Ref<boolean> = ref(false);
    const pageSize: Ref<number> = ref(20);
    const total: Ref<number> = ref(0);

    const filterTimer: Ref<ReturnType<typeof setTimeout> | null> = ref(null);

    const sortFields: Ref<SortFields> = ref(initialSortFields);

    // Funzione per recuperare dati
    async function fetchData(): Promise<void> {
        if (loading.value) return;

        loading.value = true;
        error.value = false;

        const filters: Record<string, string> = {};
        if (filterIp.value) filters['request.ip'] = filterIp.value;
        if (filterProtocol.value) filters['protocol'] = filterProtocol.value;

        let timeConfig: TimeConfig = null;
        if (timeMode.value === 'ago') {
            timeConfig = { [agoUnit.value]: agoValue.value };
        } else if (timeMode.value === 'range') {
            timeConfig = {
                from: { [fromUnit.value]: fromValue.value },
                to: { [toUnit.value]: toValue.value },
                fromDate: dateRange.value?.[0] || null,
                toDate: dateRange.value?.[1] || null,
            };
        }

        const params: FetchAttackSearchParams = {
            page: page.value,
            pageSize: pageSize.value,
            filters,
            minLogsForAttack: minLogsForAttack.value,
            timeConfig,
            sortFields: sortFields.value,
        };

        try {
            const data: FetchAttackSearchResponse = await fetchAttackSearch(params);

            attacks.value = data.attacks;
            total.value = data.total;
        } catch (err) {
            error.value = true;
            attacks.value = [];
            total.value = 0;
            console.error('Errore fetch attacks:', err);
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
    // Definiamo i campi che costituiscono un filtro
    const filterRefs = [
        filterIp,
        filterProtocol,
        minLogsForAttack,
        timeMode,
        agoValue,
        agoUnit,
        dateRange,
        fromValue,
        fromUnit,
        toValue,
        toUnit
    ];

    watch(
        [...filterRefs, page, sortFields],
        (newVal: any[], oldVal: any[]) => {
            // Verifichiamo se è cambiato uno dei filtri (gli N elementi dell'array filterRefs)
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

    // Debounced filter input handler (ora gestito internamente, lasciato per compatibilità)
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
        // fetchData() verrà chiamato dal watcher di sortFields
    }

    function getSortDirection(field: string): number {
        return sortFields.value?.[field] || 0;
    }

    function getSortClass(field: string): string {
        const dir = getSortDirection(field);
        if (dir === 1) return 'sorted-asc';
        if (dir === -1) return 'sorted-desc';
        return '';
    }

    return {
        attacks,
        filterIp,
        filterProtocol,
        sortFields,
        minLogsForAttack,
        page,
        timeMode,
        agoValue,
        agoUnit,
        dateRange,
        fromValue,
        fromUnit,
        toValue,
        toUnit,
        loading,
        error,
        pageSize,
        total,
        fetchData,
        onFilterChanged,
        toggleSort,
        getSortDirection,
        getSortClass,
    };
}
