// src/composables/useAttacksFilter.ts
import { ref } from 'vue';
import { fetchAttackSearch } from '../api/index.js';
import type { SortFields, TimeConfig } from '../models/CommonDTO';
import type { AttackLog, FetchAttackSearchParams, FetchAttackSearchResponse } from '@/models/AttackDTO.js';
import { useSearchBase } from './useSearchBase';

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
    initialSortFields: SortFields = null,
    initialPageSize: number = 20
) {
    // Filtri specifici
    const filterIp = ref(initialIp);
    const filterProtocol = ref(initialProtocol);
    const minLogsForAttack = ref(initialMinLogsForAttack);
    const timeMode = ref(initialTimeMode);
    const agoValue = ref(initialAgoValue);
    const agoUnit = ref(initialAgoUnit);
    const dateRange = ref(initialDateRange);
    const fromValue = ref(initialFromValue);
    const fromUnit = ref(initialFromUnit);
    const toValue = ref(initialToValue);
    const toUnit = ref(initialToUnit);
    
    const attacks = ref<AttackLog[]>([]);

    // Definizione dei campi che costituiscono un filtro
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
        initialPageSize,
        initialSortFields,
        filterRefs
    });

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
        onFilterChanged: () => {},
        toggleSort,
        getSortDirection,
        getSortClass,
    };
}
