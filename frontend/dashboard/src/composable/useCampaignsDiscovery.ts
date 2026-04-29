import { ref, isRef, type Ref } from 'vue';
import { fetchCampaigns } from '../api/index.js';
import { useSearchBase } from './useSearchBase';
import { useCampaignsStore } from '../stores/campaigns';

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
    initialMinLogsPerIp: number | Ref<number> = 1,
    initialStartDate: (string | null) | Ref<string | null> = null,
    initialEndDate: (string | null) | Ref<string | null> = null,
    initialSelectedUris: string[] | Ref<string[]> = [],
    initialSearch: string | Ref<string> = ''
) {
    const minIps = toRef(initialMinIps);
    const campaignsStore = useCampaignsStore();
    const minScore = toRef(initialMinScore);
    const minLogsPerIp = toRef(initialMinLogsPerIp);
    const protocol = toRef(initialProtocol);
    const timeMode = toRef(initialTimeMode);
    const agoValue = toRef(initialAgoValue);
    const agoUnit = toRef(initialAgoUnit);
    const startDate = toRef(initialStartDate);
    const endDate = toRef(initialEndDate);
    const selectedUris = toRef(initialSelectedUris);
    const search = toRef(initialSearch);
    
    const campaigns = ref<any[]>([]);
    
    const filterRefs = [
        minIps,
        minScore,
        minLogsPerIp,
        protocol,
        timeMode,
        agoValue,
        agoUnit,
        startDate,
        endDate,
        selectedUris,
        search
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
                minLogsPerIp: minLogsPerIp.value,
                protocol: protocol.value,
                page: page.value,
                pageSize: pageSize.value,
                selectedUris: selectedUris.value,
                search: search.value
            });
            
            campaigns.value = response.campaigns || [];
            total.value = response.total || campaigns.value.length;
            
            if (response.metadata) {
                campaignsStore.state.metadata.minIpCount = response.metadata.minIpCount || 0;
                campaignsStore.state.metadata.maxIpCount = response.metadata.maxIpCount || 0;
                campaignsStore.state.metadata.minScore = response.metadata.minScore || 0;
                campaignsStore.state.metadata.maxScore = response.metadata.maxScore || 0;
                campaignsStore.state.metadata.minLogsPerIp = response.metadata.minLogsPerIp || 0;
                campaignsStore.state.metadata.maxLogsPerIp = response.metadata.maxLogsPerIp || 0;
                campaignsStore.state.metadata.minDate = response.metadata.minDate || null;
                campaignsStore.state.metadata.maxDate = response.metadata.maxDate || null;
                campaignsStore.state.metadata.globalMinDate = response.metadata.globalMinDate || null;
                campaignsStore.state.metadata.globalMaxDate = response.metadata.globalMaxDate || null;

                // Auto-reset filters if they fall out of the new dynamic range
                if (minIps.value > campaignsStore.state.metadata.maxIpCount && campaignsStore.state.metadata.maxIpCount > 0) {
                    minIps.value = 2; // Default min
                }
                if (minScore.value > campaignsStore.state.metadata.maxScore && campaignsStore.state.metadata.maxScore > 0) {
                    minScore.value = 0; // Default min
                }
                if (minLogsPerIp.value > campaignsStore.state.metadata.maxLogsPerIp && campaignsStore.state.metadata.maxLogsPerIp > 0) {
                    minLogsPerIp.value = 1; // Default min quality
                }
            }
            
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
        minLogsPerIp,
        protocol,
        timeMode,
        agoValue,
        agoUnit,
        loading,
        error,
        pageSize,
        total,
        page,
        search,
        fetchData
    };
}
