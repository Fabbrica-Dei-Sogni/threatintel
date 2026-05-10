/**
 * Utility pure per il parsing delle configurazioni.
 * Questo file NON contiene valori di default, che devono essere presi dal ConfigManifest.
 */

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
