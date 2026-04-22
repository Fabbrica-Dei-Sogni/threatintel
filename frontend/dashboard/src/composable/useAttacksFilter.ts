// src/composables/useAttacksFilter.ts
import { ref, isRef, computed, type Ref } from 'vue';
import { fetchAttackSearch } from '../api/index.js';
import type { SortFields, TimeConfig } from '../models/CommonDTO';
import type { AttackLog, FetchAttackSearchParams, FetchAttackSearchResponse } from '@/models/AttackDTO.js';
import { useSearchBase } from './useSearchBase';

/**
 * Helper per normalizzare un input che può essere un valore semplice o un Ref
 */
function toRef<T>(val: T | Ref<T>): Ref<T> {
    return isRef(val) ? val : ref(val) as Ref<T>;
}

export function useAttacksFilter(
    initialIp: string | Ref<string>,
    initialProtocol: string | Ref<string> = 'http',
    initialPage: number | Ref<number>,
    initialMinLogsForAttack: number | Ref<number>,
    initialTimeMode: ('ago' | 'range') | Ref<'ago' | 'range'>,
    initialAgoValue: (number | null) | Ref<number | null>,
    initialAgoUnit: (string | null) | Ref<string | null>,
    initialDateRange: ([string | null, string | null] | null) | Ref<[string | null, string | null] | null>,
    initialFromValue: number | Ref<number>,
    initialFromUnit: string | Ref<string>,
    initialToValue: number | Ref<number>,
    initialToUnit: string | Ref<string>,
    initialSortFields: SortFields = null,
    initialPageSize: number = 20,
    initialDangerLevels: number[] | Ref<number[]> = []
) {
    // Filtri specifici - Normalizzati come Ref (se passati come computed o ref dallo store, rimangono legati)
    const filterIp = toRef(initialIp);
    const filterProtocol = toRef(initialProtocol);
    const filterDangerLevels = toRef(initialDangerLevels);
    const minLogsForAttack = toRef(initialMinLogsForAttack);
    const timeMode = toRef(initialTimeMode);
    const agoValue = toRef(initialAgoValue);
    const agoUnit = toRef(initialAgoUnit);
    const dateRange = toRef(initialDateRange);
    const fromValue = toRef(initialFromValue);
    const fromUnit = toRef(initialFromUnit);
    const toValue = toRef(initialToValue);
    const toUnit = toRef(initialToUnit);
    
    const attacks = ref<AttackLog[]>([]);

    // Definizione dei campi che costituiscono un filtro
    const filterRefs = [
        filterIp,
        filterProtocol,
        filterDangerLevels,
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
        if (filterDangerLevels.value && filterDangerLevels.value.length > 0) {
            filters['dangerLevel'] = filterDangerLevels.value.join(',');
        }

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
        filterDangerLevels,
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
