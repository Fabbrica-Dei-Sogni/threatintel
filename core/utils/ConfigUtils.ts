/**
 * Utility pure per il parsing delle configurazioni e valori di default condivisi.
 * Questo file NON deve avere dipendenze dal container DI per evitare loop.
 */

export const ConfigDefaults = {
    NODE_ENV: 'development',
    LOG_LEVEL: 'info',
    PORT: '3000',
    MONGO_URI: 'mongodb://localhost:17017/threatintel',
    MONGO_URI_TEST: 'mongodb://127.0.0.1:27017/threatintel_test',
    APP_DOMAIN: 'localhost',
    APP_BASE_PATH: '/honeypot',
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
    COMMON_ENDPOINTS: '',
    RAG_REINDEX_THRESHOLD_DAYS: '7',
    OLLAMA_EMBEDDING_TIMEOUT: '30000',
    OLLAMA_GENERATE_TIMEOUT: '60000',
    OLLAMA_NUM_PREDICT: '50',
    OLLAMA_TEMPERATURE: '0.4',
    OLLAMA_TOP_P: '0.9',
    IP_CACHE_MAX_AGE_HOURS: '24',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
    REDIS_DB: '0',
    REDIS_CONNECT_TIMEOUT_MS: '500',
    REDIS_COMMAND_TIMEOUT_MS: '500',
    DANGER_WEIGHT_RPSNORM: '0.18',
    DANGER_WEIGHT_DURNORM: '0.12',
    DANGER_WEIGHT_SCORENORM: '0.50',
    DANGER_WEIGHT_UNIQUETECHNORM: '0.20',
    DANGER_WEIGHT_DISTRIBUTED: '0.15',
    // Tolleranze scoring
    DANGER_SCORE_RPSTOL: '10',
    DANGER_SCORE_DURTOL: '361',
    DANGER_SCORE_SCORETOL: '40',
    DANGER_SCORE_DURDECAYTOL: '240',
    // Rate Limiting
    BLACKLIST_DURATION: '7200',
    LOG_RATE_LIMIT_EVENTS: 'false',
    MAX_VIOLATIONS: '5',
    DDOS_WINDOW_MS: '60000',
    DDOS_MAX_REQUESTS: '100',
    CRITICAL_WINDOW_MS: '900000',
    CRITICAL_MAX_REQUESTS: '20',
    TRAP_WINDOW_MS: '300000',
    TRAP_MAX_REQUESTS: '50',
    APP_WINDOW_MS: '60000',
    APP_MAX_REQUESTS: '200'
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
export const getApiBaseUrl = (domain: string, port: string, envApiBase?: string, appBasePath?: string): string => {
    if (envApiBase) return envApiBase;
    const protocol = getAppProtocol(domain);
    // Se la base path è "/", non aggiungiamo nulla per evitare doppi slash (es. http://localhost:3000//api)
    const basePath = appBasePath === '/' ? '' : (appBasePath || '');
    return `${protocol}://${domain}:${port}${basePath}/api`;
};
