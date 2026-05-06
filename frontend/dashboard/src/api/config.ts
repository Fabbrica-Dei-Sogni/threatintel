import axios from 'axios';
import { getApiUrl } from './index';
import { storage, StorageNamespace } from '../utils/storage';
import { useAuthStore } from '../stores/auth';

/**
 * API client per la gestione delle configurazioni honeypot
 */

export const apiClient = axios.create({
    timeout: 8000,
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

// Interceptor per gestire errori di autenticazione/autorizzazione → sempre /login
apiClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && [401, 403].includes(error.response.status)) {
        try {
            const authStore = useAuthStore();
            authStore.handleAuthError();
        } catch (e) {
            console.error('[configApiClient] Errore auth, fallback redirect:', e);
            const currentPath = window.location.pathname;
            const isAuthPage = ['/login', '/register'].some(p => currentPath.startsWith(p));
            if (!isAuthPage) {
                window.location.href = '/login';
            }
        }
    }
    return Promise.reject(error);
});

export interface ConfigItem {
    _id?: string;
    key: string;
    value: string;
    __v?: number;
}

/**
 * Recupera tutte le configurazioni
 */
export async function fetchAllConfigs(): Promise<ConfigItem[]> {
    try {
        console.log('[fetchAllConfigs] Fetching all configurations');
        const response = await apiClient.get<ConfigItem[]>('/config');
        console.log('[fetchAllConfigs] Response status:', response.status);
        console.log('[fetchAllConfigs] Configurations received:', response.data.length);
        return response.data;
    } catch (error) {
        console.error('[fetchAllConfigs] Error:', error);
        throw error;
    }
}

/**
 * Salva o aggiorna una configurazione
 */
export async function saveConfig(key: string, value: string): Promise<ConfigItem> {
    if (!key?.trim()) {
        console.warn('[saveConfig] Key non definita o vuota, chiamata API non eseguita.');
        throw new Error('Key è obbligatoria');
    }

    try {
        console.log('[saveConfig] Saving configuration:', key);
        const response = await apiClient.post<ConfigItem>('/config', { key, value });
        console.log('[saveConfig] Response status:', response.status);
        console.log('[saveConfig] Configuration saved:', response.data);
        return response.data;
    } catch (error) {
        console.error('[saveConfig] Error:', error);
        throw error;
    }
}

/**
 * Elimina una configurazione tramite chiave
 */
export async function deleteConfig(key: string): Promise<{ message: string }> {
    if (!key?.trim()) {
        console.warn('[deleteConfig] Key non definita o vuota, chiamata API non eseguita.');
        throw new Error('Key è obbligatoria');
    }

    try {
        console.log('[deleteConfig] Deleting configuration:', key);
        const response = await apiClient.delete<{ message: string }>(`/config/${encodeURIComponent(key)}`);
        console.log('[deleteConfig] Response status:', response.status);
        console.log('[deleteConfig] Configuration deleted:', response.data);
        return response.data;
    } catch (error) {
        console.error('[deleteConfig] Error:', error);
        throw error;
    }
}

/**
 * Ricerca configurazioni per chiave o valore
 */
export async function searchConfigs(query: string): Promise<ConfigItem[]> {
    try {
        console.log('[searchConfigs] Searching configurations with query:', query);
        const response = await apiClient.post<ConfigItem[]>('/config/search', { query });
        console.log('[searchConfigs] Response status:', response.status);
        console.log('[searchConfigs] Configurations found:', response.data.length);
        return response.data;
    } catch (error) {
        console.error('[searchConfigs] Error:', error);
        throw error;
    }
}

/**
 * Avvia la rianalisi di tutti i log esistenti (Asincrono)
 */
export async function reanalyzeAllLogs(batchSize: number = 200, updateDatabase: boolean = true): Promise<{ 
    message: string, 
    jobs: { 
        http: { jobId: string, status: string }, 
        ssh: { jobId: string, status: string } 
    } 
}> {
    try {
        console.log('[reanalyzeAllLogs] Starting asynchronous reanalysis of all logs');
        const response = await apiClient.post('/reanalyze-all', { batchSize, updateDatabase }, { timeout: 0 });
        console.log('[reanalyzeAllLogs] Response status:', response.status);
        return response.data;
    } catch (error) {
        console.error('[reanalyzeAllLogs] Error:', error);
        throw error;
    }
}
