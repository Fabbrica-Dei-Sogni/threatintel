import axios from 'axios';
import type { FetchSearchParams } from '../models/LogDTO';
import type { FetchAttackSearchParams } from '../models/AttackDTO';
import type { 
    FetchCampaignsParams, 
    FetchCampaignsResponse, 
    CampaignDetailDTO,
    FetchUrisResponse
} from '../models/CampaignDTO';
import { useProfileStore } from '../stores/profiles';
import { useAuthStore } from '../stores/auth';
import { storage, StorageNamespace } from '../utils/storage';

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
    // Fallback prioritario al localStorage (via HP_API namespace se migrato) o ENV
    const savedApi = storage.get<string>(StorageNamespace.API);
    return savedApi || import.meta.env.VITE_APP_API_URL || '/honeypot/api';
};

export const apiClient = axios.create({
    baseURL: getApiUrl(),
    timeout: 30000,
});

// Interceptor per gestire cambiamenti a runtime e iniettare il token
apiClient.interceptors.request.use((config) => {
    config.baseURL = getApiUrl();
    
    // Recupera il token dal namespace AUTH
    const auth = storage.get<{token: string}>(StorageNamespace.AUTH);
    if (auth?.token) {
        config.headers.Authorization = `Bearer ${auth.token}`;
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor per gestire errori di autenticazione (401/403) e fallback su errori di rete
apiClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    // 1. Gestione Errore di Rete / Timeout (Nessuna risposta dal server)
    if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        try {
            const profileStore = useProfileStore();
            if (profileStore.activeProfileId) {
                console.warn(`[apiClient] Errore di rete rilevato su profilo "${profileStore.activeProfileId}". Ripristino profilo di default...`);
                profileStore.setActiveProfile(null);
            }
        } catch (e) {
            console.error('[apiClient] Errore di rete critico:', error.message);
        }
    }

    // 2. Gestione errori di autenticazione/autorizzazione → sempre /login
    if (error.response && [401, 403].includes(error.response.status)) {
        try {
            const authStore = useAuthStore();
            authStore.handleAuthError();
        } catch (e) {
            // Fallback sicuro se Pinia non è pronto: redirect diretto a /login
            console.error('[apiClient] Errore auth, fallback redirect:', e);
            const currentPath = window.location.pathname;
            const isAuthPage = ['/login', '/register'].some(p => currentPath.startsWith(p));
            if (!isAuthPage) {
                window.location.href = '/login';
            }
        }
    }

    return Promise.reject(error);
});


// ==========================
// AUTH API WRAPPERS (Proxy)
// ==========================

export async function login(credentials: any): Promise<any> {
    try {
        const response = await apiClient.post('/auth/login', credentials);
        if (response.data.token) {
            // Salvataggio tramite StorageManager
            storage.set(StorageNamespace.AUTH, {
                token: response.data.token,
                user: response.data.user || null
            });
        }
        return response.data;
    } catch (error) {
        console.error('[login] Error:', error);
        throw error;
    }
}

export async function register(userData: any): Promise<any> {
    try {
        const response = await apiClient.post('/auth/register', userData);
        return response.data;
    } catch (error) {
        console.error('[register] Error:', error);
        throw error;
    }
}


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

export async function fetchAttackDetail({
    ip,
    minLogsForAttack,
    timeConfig = {},
    protocol = null,
    status = 'active'
}: {
    ip: string;
    minLogsForAttack: number;
    timeConfig: any;
    protocol?: string | null;
    status?: string;
}): Promise<any> {
    console.log('[fetchAttackDetail] Params:', { ip, minLogsForAttack, timeConfig, status });
    try {
        const response = await apiClient.post<any>('/attack/details', {
            ip,
            minLogsForAttack,
            timeConfig,
            protocol,
            status
        });

        console.log('[fetchAttackDetail] Response status:', response.status);
        return response.data;
    } catch (error) {
        console.error('[fetchAttackDetail] Error:', error);
        throw error;
    }
}

export async function fetchDistributedAttackDetail({
    ipList,
    minLogsForAttack,
    timeConfig = {},
    protocol = null,
    status = 'active'
}: {
    ipList: string[];
    minLogsForAttack: number;
    timeConfig: any;
    protocol?: string | null;
    status?: string;
}): Promise<any> {
    console.log('[fetchDistributedAttackDetail] Params:', { ipList, minLogsForAttack, timeConfig, status });
    try {
        const response = await apiClient.post<any>('/attack/distributed', {
            ipList,
            minLogsForAttack,
            timeConfig,
            protocol,
            status
        });

        console.log('[fetchDistributedAttackDetail] Response status:', response.status);
        return response.data;
    } catch (error) {
        console.error('[fetchDistributedAttackDetail] Error:', error);
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

// ==========================
// COWRIE TELNET API WRAPPERS
// ==========================

export async function fetchCowrieSessions(page = 1, pageSize = 20, sortFields: any = null, filters: any = null): Promise<any> {
    try {
        const response = await apiClient.post('/cowrie/search', {
            page,
            pageSize,
            sortFields,
            filters
        });
        return response.data;
    } catch (error) {
        console.error('[fetchCowrieSessions] Error:', error);
        throw error;
    }
}

export async function fetchCowrieSessionDetails(sessionId: string): Promise<any> {
    try {
        const response = await apiClient.get(`/cowrie/sessions/${sessionId}`);
        return response.data;
    } catch (error) {
        console.error('[fetchCowrieSessionDetails] Error:', error);
        throw error;
    }
}

export async function fetchCowrieSessionEvents(sessionId: string): Promise<any> {
    try {
        const response = await apiClient.get(`/cowrie/sessions/${sessionId}/events`);
        return response.data;
    } catch (error) {
        console.error('[fetchCowrieSessionEvents] Error:', error);
        throw error;
    }
}

/**
 * Recupera un report (Dossier) in formato PDF o HTML
 * @param params { type: 'attack'|'telnet'|'ip', ip?: string, sessionId?: string, format?: 'pdf'|'html' }
 */
export async function fetchReport(params: {
    type: string;
    ip?: string;
    sessionId?: string;
    ipList?: string | null;
    format?: string;
    style?: string;
    locale?: string;
}): Promise<Blob> {
    try {
        const response = await apiClient.get('/reports/dettaglio', {
            params,
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        console.error('[fetchReport] Error:', error);
        throw error;
    }
}
/**
 * Genera un dossier personalizzato (Custom Dossier)
 * @param payload { sections: Array, locale: string }
 * @param format 'pdf' | 'html'
 */
export async function fetchCustomReport(payload: any, format: string = 'pdf', style: string = 'telex'): Promise<any> {
    try {
        const response = await apiClient.post('/reports/custom', payload, {
            params: { format, style },
            responseType: format === 'pdf' ? 'blob' : 'text'
        });

        if (format === 'pdf') {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `custom_dossier_${new Date().getTime()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            return null;
        }

        return response.data;
    } catch (error) {
        console.error('[fetchCustomReport] Error:', error);
        throw error;
    }
}

// ==========================
// DOSSIER (PERSISTENCE) API
// ==========================

/**
 * @param timeframe '24h' | '1w' | '1m' | '1y' | 'all'
 * @param minScore Sogli minima di rischio
 * @param limit Numero di elementi per le classifiche top (può essere "all" o numero)
 */
export async function fetchStats(timeframe: string = '24h', minScore: number = 15, limit: string | number = 10, minLogs: number = 1): Promise<any> {
    try {
        const response = await apiClient.get('/stats', { 
            params: { 
                timeframe, 
                minScore, 
                top: limit,
                minLogs
            } 
        });
        return response.data;
    } catch (error) {
        console.error('[fetchStats] Error:', error);
        throw error;
    }
}

export async function fetchDossiers(params: any = {}): Promise<any> {
    try {
        const response = await apiClient.get('/dossiers', { params });
        return response.data;
    } catch (error) {
        console.error('[fetchDossiers] Error:', error);
        throw error;
    }
}

export async function fetchDossierById(id: string): Promise<any> {
    try {
        const response = await apiClient.get(`/dossiers/${id}`);
        return response.data;
    } catch (error) {
        console.error('[fetchDossierById] Error:', error);
        throw error;
    }
}

export async function saveDossier(payload: any): Promise<any> {
    try {
        const response = await apiClient.post('/dossiers', payload);
        return response.data;
    } catch (error) {
        console.error('[saveDossier] Error:', error);
        throw error;
    }
}

export async function updateDossier(id: string, payload: any): Promise<any> {
    try {
        const response = await apiClient.patch(`/dossiers/${id}`, payload);
        return response.data;
    } catch (error) {
        console.error('[updateDossier] Error:', error);
        throw error;
    }
}

export async function deleteDossier(id: string): Promise<any> {
    try {
        const response = await apiClient.delete(`/dossiers/${id}`);
        return response.data;
    } catch (error) {
        console.error('[deleteDossier] Error:', error);
        throw error;
    }
}

/**
 * Esporta un dossier salvato in formato PDF o HTML
 */
export async function exportDossier(id: string, format: string = 'pdf', style: string = 'classic', locale: string = 'it-IT'): Promise<any> {
    try {
        const response = await apiClient.get(`/dossiers/${id}/export`, {
            params: { format, style, locale },
            responseType: format === 'pdf' ? 'blob' : 'text'
        });

        if (format === 'pdf') {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `dossier_${id}_${new Date().getTime()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            return null;
        }

        return response.data;
    } catch (error) {
        console.error('[exportDossier] Error:', error);
        throw error;
    }
}

// ==========================
// CAMPAIGNS (DISTRIBUTED ANALYTICS)
// ==========================

export async function fetchCampaigns({
    startTime,
    endTime,
    timeMode,
    agoValue,
    agoUnit,
    minIps = 2,
    minScore = 0,
    minLogsPerIp = 1,
    protocol = 'http',
    page = 1,
    pageSize = 10,
    selectedUris = [],
    search = '',
    minCorrelations = 0,
    status = 'active'
}: FetchCampaignsParams = {}): Promise<FetchCampaignsResponse> {
    try {
        const response = await apiClient.get('/campaign/search', {
            params: { startTime, endTime, timeMode, agoValue, agoUnit, minIps, minScore, minLogsPerIp, minCorrelations, protocol, page, pageSize, selectedUris, search, status }
        });
        return response.data;
    } catch (error) {
        console.error('[fetchCampaigns] Error:', error);
        throw error;
    }
}

export async function fetchCampaignDetail({
    hash,
    ips = [],
    minLogsPerIp = 1,
    minScore = 0,
    protocol = null,
    timeConfig = {},
    page = 1,
    pageSize = 10,
    status = 'active'
}: {
    hash: string;
    ips?: string[];
    minLogsPerIp?: number;
    minScore?: number;
    protocol?: string | null;
    timeConfig?: any;
    page?: number;
    pageSize?: number;
    status?: string;
}): Promise<CampaignDetailDTO> {
    try {
        const response = await apiClient.post('/campaign/detail', {
            hash,
            ips,
            minLogsPerIp,
            minScore,
            protocol,
            timeConfig,
            page,
            pageSize,
            status
        });
        return response.data;
    } catch (error) {
        console.error('[fetchCampaignDetail] Error:', error);
        throw error;
    }
}

export async function fetchUniqueUris(params: any = {}): Promise<FetchUrisResponse> {
    try {
        const response = await apiClient.get<FetchUrisResponse>('/campaign/uris', { params });
        return response.data;
    } catch (error) {
        console.error('[fetchUniqueUris] Error:', error);
        throw error;
    }
}


// ==========================
// ASSISTANT & AGENTIC RAG (Orchestrated via ChainPrompt AI)
// ==========================

export const getChainPromptUrl = (): string => {
    return import.meta.env.VITE_CHAINPROMPT_API_URL || 'http://localhost:5000/api';
};

/**
 * Invia una domanda all'Agente AI orchestrato da ChainPrompt
 * @param question La domanda in linguaggio naturale
 * @param provider Il provider LLM da usare (ollama, openai, ecc)
 */
export async function askAgent(question: string, provider: string = 'ollama'): Promise<any> {
    const chainPromptUrl = getChainPromptUrl();
    try {
        // L'endpoint su chainprompt è /features/:provider/threatintel/
        const response = await axios.post(`${chainPromptUrl}/features/${provider}/threatintel/`, {
            question,
            noappendchat: true // Evita di appendere il contenuto nei log di chainprompt se non necessario
        });
        return response.data;
    } catch (error) {
        console.error('[askAgent] Error calling ChainPrompt AI:', error);
        throw error;
    }
}

/**
 * Esegue una ricerca semantica diretta (senza passare per l'agente)
 */
export async function semanticSearch(query: string, options: any = {}): Promise<any> {
    try {
        const response = await apiClient.post('/assistant/search', {
            query,
            ...options
        });
        return response.data;
    } catch (error) {
        console.error('[semanticSearch] Error:', error);
        throw error;
    }
}

export async function ask(question: string, options: any = {}): Promise<any> {
    try {
        const response = await apiClient.post('/assistant/ask', {
            question,
            ...options
        });
        return response.data;
    } catch (error) {
        console.error('[ask] Error:', error);
        throw error;
    }
}

/**
 * Risolve un riferimento sorgente per ottenere i dati tecnici
 */
export async function resolveSource(sourceRef: any): Promise<any> {
    try {
        const response = await apiClient.post('/assistant/resolve', { sourceRef });
        return response.data;
    } catch (error) {
        console.error('[resolveSource] Error:', error);
        throw error;
    }
}
