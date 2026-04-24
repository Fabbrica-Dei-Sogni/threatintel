import { ref, isRef, computed, type Ref } from 'vue';
import { fetchCampaigns } from '../api/index.js';
import { useSearchBase } from './useSearchBase';

/**
 * Helper per normalizzare un input che può essere un valore semplice o un Ref
 */
function toRef<T>(val: T | Ref<T>): Ref<T> {
    return isRef(val) ? val : ref(val) as Ref<T>;
}

export function useCampaignsDiscovery(
    initialPage: number | Ref<number>,
    initialMinIps: number | Ref<number>,
    initialTimeMode: ('ago' | 'range') | Ref<'ago' | 'range'>,
    initialAgoValue: (number | null) | Ref<number | null>,
    initialAgoUnit: (string | null) | Ref<string | null>,
    initialPageSize: number | Ref<number> = 20
) {
    const minIps = toRef(initialMinIps);
    const timeMode = toRef(initialTimeMode);
    const agoValue = toRef(initialAgoValue);
    const agoUnit = toRef(initialAgoUnit);
    
    const campaigns = ref<any[]>([]);

    const filterRefs = [
        minIps,
        timeMode,
        agoValue,
        agoUnit
    ];

    async function fetchData() {
        loading.value = true;
        error.value = null;

        let startTime: string | undefined;
        let endTime: string | undefined;

        if (timeMode.value === 'ago' && agoValue.value) {
            const now = new Date();
            const start = new Date();
            const unit = agoUnit.value || 'days';
            const val = agoValue.value || 0;

            if (unit === 'minutes') start.setMinutes(now.getMinutes() - val);
            else if (unit === 'hours') start.setHours(now.getHours() - val);
            else if (unit === 'days') start.setDate(now.getDate() - val);
            else if (unit === 'months') start.setMonth(now.getMonth() - val);
            else if (unit === 'years') start.setFullYear(now.getFullYear() - val);

            startTime = start.toISOString();
        }

        try {
            const response = await fetchCampaigns({
                startTime,
                endTime,
                minIps: minIps.value
            });
            campaigns.value = response.campaigns || [];
            total.value = response.count || campaigns.value.length;
        } catch (err) {
            console.error('[useCampaignsDiscovery] Error:', err);
            error.value = true;
            campaigns.value = [];
        } finally {
            loading.value = false;
        }
    }

    const {
        page,
        pageSize,
        total,
        loading,
        error
    } = useSearchBase({
        fetchFn: fetchData,
        initialPage,
        initialPageSize,
        filterRefs,
        routeName: 'Campaigns'
    });

    return {
        campaigns,
        minIps,
        timeMode,
        agoValue,
        agoUnit,
        loading,
        error,
        pageSize,
        total,
        page,
        fetchData
    };
}
