// core/utils/queryGuard.ts

/**
 * Campi ordinabili per ogni dominio.
 * Aggiungi qui i campi quando ne aggiungi di nuovi al modello.
 */
const THREAT_LOG_SORT_FIELDS = new Set([
    'timestamp', 'request.ip', 'request.url', 'request.method',
    'fingerprint.score', 'fingerprint.suspicious', 'protocol'
]);

const ATTACK_SORT_FIELDS = new Set([
    'dangerScore', 'averageScore', 'countRateLimit', 'rps', 'totaleLogs', 
    'durataAttacco.ms', 'firstSeen', 'lastSeen', 'request.ip', 'attackDurationMinutes'
]);

const COWRIE_SESSION_SORT_FIELDS = new Set([
    'timestamp', 'src_ip', 'duration', 'eventCount',
    'session', 'sensor', 'protocol', 'occurrenceCount', 'starttime'
]);

const DOSSIER_SORT_FIELDS = new Set([
    'createdAt', 'updatedAt', 'title', 'status', 'owner'
]);

/**
 * Campi filtrabili per ogni dominio (whitelist).
 */
const THREAT_LOG_FILTER_FIELDS = new Set([
    'request.ip', 'request.url', 'request.method', 'request.userAgent',
    'fingerprint.suspicious', 'fingerprint.score', 'protocol', 'timestamp'
]);

const COWRIE_SESSION_FILTER_FIELDS = new Set([
    'src_ip', 'session', 'sensor', 'protocol', 'timestamp', 'sessionCategory'
]);

/**
 * Escapa i caratteri speciali regex in una stringa.
 * Previene ReDoS su input utente.
 */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizza i sortFields controllando la whitelist e i valori ammessi (1 | -1).
 * Ritorna sempre un oggetto safe, mai null.
 */
export function sanitizeSortFields(
    sortFields: any,
    allowedFields?: Set<string> | null,
    defaultSort: Record<string, 1 | -1> = { timestamp: -1 }
): Record<string, 1 | -1> {
    if (!sortFields || typeof sortFields !== 'object' || Array.isArray(sortFields)) {
        return defaultSort;
    }

    const safe: Record<string, 1 | -1> = {};
    for (const [key, value] of Object.entries(sortFields)) {
        // Se allowedFields è null o undefined, accettiamo qualsiasi chiave (permissivo)
        // Altrimenti controlliamo che la chiave sia nella whitelist (restrittivo)
        const isAllowed = !allowedFields || allowedFields.has(key);
        
        if (isAllowed && (value === 1 || value === -1)) {
            safe[key] = value;
        }
    }

    return Object.keys(safe).length > 0 ? safe : defaultSort;
}

/**
 * Sanitizza i filtri controllando la whitelist delle chiavi
 * ed escapando i valori stringa per prevenire ReDoS.
 */
export function sanitizeFilters(
    filters: any,
    allowedFields: Set<string>
): Record<string, any> {
    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
        return {};
    }

    const safe: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (!allowedFields.has(key)) continue;

        if (typeof value === 'string') {
            // Stringa vuota = ignora il filtro
            if (value.trim() === '') continue;
            // Escaping prima di usare come regex
            safe[key] = escapeRegex(value.trim());
        } else if (typeof value === 'boolean' || typeof value === 'number') {
            safe[key] = value;
        }
        // Oggetti/array non primitivi vengono ignorati
    }

    return safe;
}

/**
 * Sanitizza una dimensione di pagina con un massimo configurabile.
 */
export function sanitizePageSize(value: any, max = 200, defaultSize = 20): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) return defaultSize;
    return Math.min(parsed, max);
}

/**
 * Sanitizza un numero di pagina.
 */
export function sanitizePage(value: any): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

/**
 * Sanitizza un limit intero con un massimo configurabile.
 */
export function sanitizeLimit(value: any, max = 1000, defaultVal = 100): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) return defaultVal;
    return Math.min(parsed, max);
}

export const SortAllowedFields = {
    threatLog: THREAT_LOG_SORT_FIELDS,
    attack: ATTACK_SORT_FIELDS,
    cowrieSession: COWRIE_SESSION_SORT_FIELDS,
    dossier: DOSSIER_SORT_FIELDS,
};

export const FilterAllowedFields = {
    threatLog: THREAT_LOG_FILTER_FIELDS,
    cowrieSession: COWRIE_SESSION_FILTER_FIELDS,
};