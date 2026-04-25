import { ref, isRef, type Ref } from 'vue';
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
    initialMinScore: number | Ref<number>,
    initialProtocol: string | Ref<string>,
    initialTimeMode: ('ago' | 'range') | Ref<'ago' | 'range'>,
    initialAgoValue: (number | null) | Ref<number | null>,
    initialAgoUnit: (string | null) | Ref<string | null>,
    initialPageSize: number | Ref<number> = 10,
    initialStartDate: (string | null) | Ref<string | null> = null,
    initialEndDate: (string | null) | Ref<string | null> = null
) {
    const minIps = toRef(initialMinIps);
    const minScore = toRef(initialMinScore);
    const protocol = toRef(initialProtocol);
    const timeMode = toRef(initialTimeMode);
    const agoValue = toRef(initialAgoValue);
    const agoUnit = toRef(initialAgoUnit);
    const startDate = toRef(initialStartDate);
    const endDate = toRef(initialEndDate);
    
    const campaigns = ref<any[]>([]);
    
    const filterRefs = [
        minIps,
        minScore,
        protocol,
        timeMode,
        agoValue,
        agoUnit,
        startDate,
        endDate
    ];

    async function fetchData() {
        loading.value = true;
        error.value = null;

        try {
            const response = await fetchCampaigns({
                timeMode: timeMode.value,
                agoValue: agoValue.value,
                agoUnit: agoUnit.value,
                startTime: startDate.value,
                endTime: endDate.value,
                minIps: minIps.value,
                minScore: minScore.value,
                protocol: protocol.value,
                page: page.value,
                pageSize: pageSize.value
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
        minScore,
        protocol,
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
