import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { fetchCampaignDetail } from '../api';
import { useCampaignsStore } from '../stores/campaigns';
import type { CampaignDetailDTO } from '../models/CampaignDTO';

export function useCampaignDetail(hash: string) {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const campaignsStore = useCampaignsStore();

    const campaign = ref<CampaignDetailDTO | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const nodesPage = ref(1);
    const pageSize = ref(10);

    // UI State persistente da Pinia
    const uiState = computed(() => campaignsStore.getUiState(hash));
    const showChart = computed({
        get: () => uiState.value.showChart,
        set: (val) => campaignsStore.updateUiState(hash, { showChart: val })
    });
    const showHub = computed({
        get: () => uiState.value.showHub,
        set: (val) => campaignsStore.updateUiState(hash, { showHub: val })
    });

    // Selezione IP tattici da Pinia
    const selectedIps = computed(() => campaignsStore.getTargetedIps(hash));
    
    const isTargetedMode = computed(() => selectedIps.value.length > 0);

    // DTO delle correlazioni fornito dal backend (su tutti gli IP della campagna)
    const correlationHubs = computed(() => {
        return campaign.value?.correlations || [];
    });

    async function loadCampaign(targetHash: string, params: {
        minLogsPerIp: number;
        minScore: number;
        protocol: string | null;
        timeMode: string;
        agoValue: number | null;
        agoUnit: string | null;
    }) {
        loading.value = true;
        error.value = null;
        try {
            const data = await fetchCampaignDetail({
                hash: targetHash,
                minLogsPerIp: params.minLogsPerIp,
                minScore: params.minScore,
                protocol: params.protocol,
                page: nodesPage.value,
                pageSize: pageSize.value,
                timeConfig: {
                    startTime: route.query.customStartTime as string,
                    endTime: route.query.customEndTime as string,
                    timeMode: params.timeMode,
                    agoValue: params.agoValue,
                    agoUnit: params.agoUnit
                }
            });
            campaign.value = data;
        } catch (err: any) {
            console.error('[useCampaignDetail] Error loading campaign:', err);
            error.value = t('common.error');
        } finally {
            loading.value = false;
        }
    }

    function toggleIpSelection(ip: string) {
        campaignsStore.toggleTargetedIp(hash, ip);
    }

    function clearSelection() {
        campaignsStore.clearTargetedIps(hash);
    }

    function setTargetedIps(ips: string[]) {
        campaignsStore.setTargetedIps(hash, ips);
    }

    /**
     * Naviga verso il dettaglio dell'attacco (investigazione)
     * @param ip IP singolo o null per usare la selezione/cluster
     */
    function investigate(ip: string | null, params: any) {
        let ipsToInvestigate: string[] = [];
        
        if (ip) {
            // Investigazione singolo IP
            ipsToInvestigate = [ip];
        } else {
            // Investigazione Cluster o Selezione
            ipsToInvestigate = selectedIps.value.length > 0 
                ? selectedIps.value 
                : (campaign.value?.allIps || []);
        }

        if (ipsToInvestigate.length === 0) return;

        const query: any = {
            timeMode: params.timeMode,
            agoValue: params.agoValue,
            agoUnit: params.agoUnit,
            minLogsForAttack: params.minLogsPerIp || 1,
            protocol: params.protocol
        };

        // Passiamo la lista IP solo se è un'analisi distribuita (> 1 IP o selezione esplicita)
        if (ipsToInvestigate.length > 1 || (selectedIps.value.length > 0 && !ip)) {
            query.ipList = JSON.stringify(ipsToInvestigate);
        }

        // Gestione date custom per coerenza
        if (route.query.customStartTime || route.query.customEndTime) {
            query.dateRange = JSON.stringify([
                route.query.customStartTime || null,
                route.query.customEndTime || null
            ]);
        }

        router.push({
            name: 'AttackDetail',
            params: { ip: ipsToInvestigate[0] },
            query
        });
    }

    return {
        campaign,
        loading,
        error,
        nodesPage,
        pageSize,
        showChart,
        showHub,
        correlationHubs,
        selectedIps,
        isTargetedMode,
        loadCampaign,
        toggleIpSelection,
        clearSelection,
        setTargetedIps,
        investigate
    };
}
