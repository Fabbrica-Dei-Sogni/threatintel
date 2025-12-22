import axios from 'axios';
import type { FetchSearchParams } from '../models/LogDTO';
import type { FetchAttackSearchParams } from '../models/AttackDTO';
import { useProfileStore } from '../stores/profiles';

// Funzione helper per ottenere l'URL, con fallback sulla gestione dei profili
export const getApiUrl = (): string => {
    try {
        // Accediamo allo store solo se necessario e se Pinia è pronto
        const profileStore = useProfileStore();
        if (profileStore && profileStore.activeProfile) {
            return profileStore.activeProfile.apiUrl;
        }
    } catch (e) {
        // Silenziamo l'errore se Pinia non è ancora pronto
    }
    // Fallback prioritario al localStorage (vecchio sistema) o ENV
    return localStorage.getItem('api_url') || import.meta.env.VITE_APP_API_URL || 'https://alessandromodica.com:2443/honeypot';
};

const apiClient = axios.create({
    baseURL: getApiUrl(),
    timeout: 8000,
});

// Interceptor per gestire cambiamenti a runtime
apiClient.interceptors.request.use((config) => {
    config.baseURL = getApiUrl();
    return config;
});



export async function fetchLogById(id: string): Promise<any> {
    if (!id?.trim()) {
        console.warn('[fetchLogById] ID non definito o vuoto, chiamata API non eseguita.');
        return { data: null };
    }

    try {
        console.log('[fetchLogById] Fetching details for ThreatLog:', id);
        const response = await apiClient.get<any>(`/logs/${id}`);
        console.log('[fetchLogById] Response status:', response.status);
        console.log('[fetchLogById] ThreatLog details received:', response.data);
        return response.data;
    } catch (error) {
        console.error('[fetchLogById] Error:', error);
        throw error;
    }
}

/**
 * 
   @deprecated
 * @param params 
 * @returns 
 */
export async function fetchLogs(params: Record<string, any>): Promise<any> {
    console.log('[fetchLogs] Params:', params);
    try {
        const response = await apiClient.get<any>('/logs', { params });
        console.log('[fetchLogs] Response status:', response.status);
        console.log('[fetchLogs] Number of logs received:', response.data.length);
        return response.data;
    } catch (error) {
        console.error('[fetchLogs] Error:', error);
        throw error;
    }
}

export async function fetchSearch({
    page = 1,
    pageSize = 20,
    filters = {},
    sortFields = null,
}: FetchSearchParams): Promise<any> {
    console.log('[fetchSearch] Params:', { page, pageSize, filters, sortFields });
    try {
        const pageNum = Math.max(1, Number(page));
        const pageSizeNum = Math.max(1, Number(pageSize));

        const response = await apiClient.post<any>('/search', {
            page: pageNum,
            pageSize: pageSizeNum,
            filters,
            sortFields,
        });

        console.log('[fetchSearch] Response status:', response.status);
        console.log('[fetchSearch] Number of logs received:', response.data.logs.length);

        return response.data;
    } catch (error) {
        console.error('[fetchSearch] Error:', error);
        throw error;
    }
}

export async function fetchAttackSearch({
    page = 1,
    pageSize = 20,
    filters = {},
    minLogsForAttack,
    timeConfig = {},
    sortFields = null,
}: FetchAttackSearchParams): Promise<any> {
    console.log('[fetchAttackSearch] Params:', { page, pageSize, filters });
    try {
        const pageNum = Math.max(1, Number(page));
        const pageSizeNum = Math.max(1, Number(pageSize));

        const response = await apiClient.post<any>('/attack/search', {
            page: pageNum,
            pageSize: pageSizeNum,
            filters,
            minLogsForAttack,
            timeConfig,
            sortFields,
        });

        console.log('[fetchAttackSearch] Response status:', response.status);
        console.log('[fetchAttackSearch] Number of attacks received:', response.data.attacks.length);

        return response.data;
    } catch (error) {
        console.error('[fetchAttackSearch] Error:', error);
        throw error;
    }
}

export async function fetchRateLimitSearch({
    page = 1,
    pageSize = 20,
    filters = {},
}: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
}): Promise<any> {
    console.log('[fetchRateLimitSearch] Params:', { page, pageSize, filters });
    try {
        const pageNum = Math.max(1, Number(page));
        const pageSizeNum = Math.max(1, Number(pageSize));

        const response = await apiClient.post<any>('/ratelimit/search', {
            page: pageNum,
            pageSize: pageSizeNum,
            filters,
        });

        console.log('[fetchRateLimitSearch] Response status:', response.status);
        console.log('[fetchRateLimitSearch] Number of logs received:', response.data.bobjs.length);

        return response.data;
    } catch (error) {
        console.error('[fetchRateLimitSearch] Error:', error);
        throw error;
    }
}

export async function fetchIpDetails(ip: string): Promise<any> {
    if (!ip?.trim()) {
        console.warn('[fetchIpDetails] IP non definito o vuoto, chiamata API non eseguita.');
        return { data: null };
    }

    try {
        console.log('[fetchIpDetails] Fetching details for IP:', ip);
        const response = await apiClient.get<any>(`/ipdetail/${ip}`);
        console.log('[fetchIpDetails] Response status:', response.status);
        console.log('[fetchIpDetails] IP details received:', response.data);
        return response.data;
    } catch (error) {
        console.error('[fetchIpDetails] Error:', error);
        throw error;
    }
}

export async function enrichReports(ip: string): Promise<any> {
    if (!ip?.trim()) {
        console.warn('[enrichReports] IP non definito o vuoto, chiamata API non eseguita.');
        return null;
    }

    try {
        console.log('[enrichReports] Recupero e salvataggio reports per IP:', ip);
        const response = await apiClient.post<any>(`/enrichreports/${ip}`);
        console.log('[enrichReports] Reports aggiornati:', response.data);
        return response.data;
    } catch (error) {
        console.error('[enrichReports] Errore:', error);
        throw error;
    }
}

export async function enrichReputationScore(ip: string): Promise<any> {
    if (!ip?.trim()) {
        console.warn('[enrichReputationScore] IP non definito o vuoto, chiamata API non eseguita.');
        return null;
    }

    try {
        console.log('[enrichReputationScore] Recupero e salvataggio reputation score per IP:', ip);
        const response = await apiClient.post<any>(`/enrich/${ip}`);
        console.log('[enrichReputationScore] Reputation Score aggiornato:', response.data);
        return response.data;
    } catch (error) {
        console.error('[enrichReputationScore] Errore:', error);
        throw error;
    }
}
