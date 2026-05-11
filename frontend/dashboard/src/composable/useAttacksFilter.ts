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
    initialStatus: string | Ref<string> = 'active',
    initialSortFields: SortFields | Ref<SortFields> = null,
    initialPageSize: number | Ref<number> = 20,
    initialDangerLevels: number[] | Ref<number[]> = [],
    initialAttackPatterns: string | Ref<string> = '',
    initialUserAgent: string | Ref<string> = ''
) {
    // Filtri specifici - Normalizzati come Ref (se passati come computed o ref dallo store, rimangono legati)
    const filterIp = toRef(initialIp);
    const filterProtocol = toRef(initialProtocol);
    const filterStatus = toRef(initialStatus);
    const filterDangerLevels = toRef(initialDangerLevels);
    const filterAttackPatterns = toRef(initialAttackPatterns);
    const filterUserAgent = toRef(initialUserAgent);
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
        filterStatus,
        minLogsForAttack,
        timeMode,
        agoValue,
        agoUnit,
        dateRange,
        fromValue,
        fromUnit,
        toValue,
        toUnit,
        filterDangerLevels,
        filterAttackPatterns,
        filterUserAgent
    ];

    async function fetchData() {
        loading.value = true;
        error.value = null;

        let timeConfig: TimeConfig = null;

        if (timeMode.value === 'ago') {
            timeConfig = { [agoUnit.value]: agoValue.value ?? 0 };
        } else {
            timeConfig = {
                from: { [fromUnit.value]: fromValue.value },
                to: { [toUnit.value]: toValue.value },
                fromDate: dateRange.value ? dateRange.value[0] : null,
                toDate: dateRange.value ? dateRange.value[1] : null
            };
        }

        const params: FetchAttackSearchParams = {
            page: page.value,
            pageSize: pageSize.value,
            filters: {
                'request.ip': filterIp.value,
                protocol: filterProtocol.value,
                status: filterStatus.value,
                dangerLevel: filterDangerLevels.value.length > 0 ? filterDangerLevels.value.join(',') : null,
                attackPatterns: filterAttackPatterns.value || null,
                'request.userAgent': filterUserAgent.value || null
            },
            minLogsForAttack: minLogsForAttack.value,
            timeConfig,
            sortFields: sortFields.value
        };

        try {
            const response: FetchAttackSearchResponse = await fetchAttackSearch(params);
            attacks.value = response.attacks;
            total.value = response.total;
        } catch (err) {
            console.error('[useAttacksFilter] Error:', err);
            error.value = true;
            attacks.value = [];
        } finally {
            loading.value = false;
        }
    }

    // Integrazione useSearchBase
    const {
        page,
        pageSize,
        sortFields,
        total,
        loading,
        error,
        debouncedFetch,
        toggleSort,
        getSortDirection,
        getSortClass
    } = useSearchBase({
        fetchFn: fetchData,
        initialPage,
        initialPageSize,
        initialSortFields,
        filterRefs,
        routeName: 'Attacks'
    });

    return {
        attacks,
        filterIp,
        filterProtocol,
        filterStatus,
        sortFields,
        minLogsForAttack,
        timeMode,
        agoValue,
        agoUnit,
        dateRange,
        fromValue,
        fromUnit,
        toValue,
        toUnit,
        filterDangerLevels,
        filterAttackPatterns,
        filterUserAgent,
        loading,
        error,
        pageSize,
        total,
        page,
        fetchData,
        onFilterChanged: () => {},
        toggleSort,
        getSortDirection,
        getSortClass,
    };
}
