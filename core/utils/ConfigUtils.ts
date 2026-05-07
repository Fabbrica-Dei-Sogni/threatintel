/**
 * Utility pure per il parsing delle configurazioni e valori di default condivisi.
 * Questo file NON deve avere dipendenze dal container DI per evitare loop.
 */

export const ConfigDefaults = {
    PORT: '3000',
    MONGO_URI: 'mongodb://localhost:17017/threatintel',
    APP_DOMAIN: 'localhost',
    AUTH_URI: 'https://localhost:3443/auth/api/v1',
    APP_ID: 'honeypot-host-001',
    QDRANT_URL: 'http://localhost:6333',
    OLLAMA_URL: 'http://localhost:11434',
    ALLOWED_ORIGINS: [
        'http://localhost:5173',
        'http://localhost:4300',
        'https://alessandromodica.com',
        'http://82.112.255.186:5173',
        'http://82.112.255.186:4300'
    ],
    RAG_REINDEX_THRESHOLD_DAYS: '7',
    OLLAMA_EMBEDDING_TIMEOUT: '30000',
    OLLAMA_GENERATE_TIMEOUT: '60000'
};

/**
 * Parsa una stringa CSV in un array di stringhe pulite
 */
export const parseCsv = (value: string | undefined, defaults: string[] = []): string[] => {
    if (!value) return defaults;
    return value.split(',').map(v => v.trim()).filter(Boolean);
};

/**
 * Determina il protocollo basato sul dominio
 */
export const getAppProtocol = (domain: string): string => {
    return domain === 'localhost' || domain === '127.0.0.1' ? 'http' : 'https';
};

/**
 * Compone l'URL base dell'applicazione
 */
export const getAppFullUrl = (domain: string, protocol?: string): string => {
    const proto = protocol || getAppProtocol(domain);
    return `${proto}://${domain}`;
};

/**
 * Compone l'URL base delle API
 */
export const getApiBaseUrl = (domain: string, port: string, envApiBase?: string): string => {
    if (envApiBase) return envApiBase;
    const protocol = getAppProtocol(domain);
    return `${protocol}://${domain}:${port}/honeypot/api`;
};
