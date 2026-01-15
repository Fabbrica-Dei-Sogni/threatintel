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

    async function fetchData(): Promise<void> {
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

    watch(
        [
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
            toUnit,
        ],
        () => {
            //page.value = 1;
            fetchData();
        }
    );

    watch(page, () => {
        fetchData();
    });

    function onFilterChanged(resetPage = true): void {
        if (filterTimer.value) clearTimeout(filterTimer.value);
        filterTimer.value = setTimeout(() => {
            if (resetPage) {
                page.value = 1;
            }
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
        // page.value = 1;
        fetchData();
    }

    function getSortDirection(field: string): number {
        return sortFields.value?.[field] || 0;
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
    };
}
