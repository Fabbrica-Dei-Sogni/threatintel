/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

// core/utils/queryGuard.ts

/**
 * Campi ordinabili per ogni dominio.
 * Aggiungi qui i campi quando ne aggiungi di nuovi al modello.
 */
const THREAT_LOG_SORT_FIELDS = new Set([
    'timestamp', 'request.ip', 'request.url', 'request.method',
    'fingerprint.score', 'fingerprint.suspicious', 'protocol', 'fingerprint.hash'
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
    'fingerprint.suspicious', 'fingerprint.score', 'protocol', 'timestamp',
    'dangerLevel', 'fingerprint.hash', 'status'
]);

const ATTACK_FILTER_FIELDS = new Set([
    'request.ip', 'request.url', 'request.method', 'request.userAgent', 'geo.country', 'country', 'protocol', 'timestamp',
    'dangerLevel', 'fingerprint.hash', 'totaleLogs', 'dangerScore', 'averageScore', 'attackPatterns', 'status'
]);

const COWRIE_SESSION_FILTER_FIELDS = new Set([
    'src_ip', 'session', 'sensor', 'protocol', 'timestamp', 'sessionCategory'
]);

const CAMPAIGN_FILTER_FIELDS = new Set([
    'minIps', 'minScore', 'minLogsPerIp', 'minCorrelations', 'protocol', 'startTime', 'endTime', 'page', 'pageSize', 'timeMode', 'agoValue', 'agoUnit', 'selectedUris', 'search', 'userAgent', 'status'
]);

const CAMPAIGN_SORT_FIELDS = new Set([
    'ipCount', 'totaleLogs', 'firstSeen', 'lastSeen'
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
 * Esclude dall'escaping i campi di tipo data.
 */
export function sanitizeFilters(
    filters: any,
    allowedFields: Set<string>
): Record<string, any> {
    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
        return {};
    }

    const DATE_FIELDS = new Set(['startTime', 'endTime', 'timestamp', 'fromDate', 'toDate', 'firstSeen', 'lastSeen']);

    const safe: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (!allowedFields.has(key)) continue;

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') continue;

            // Se è un campo data, non applichiamo escapeRegex per non corrompere il formato ISO
            if (DATE_FIELDS.has(key)) {
                safe[key] = trimmed;
            } else {
                /**
                 * NOTA: L'escapeRegex automatico è stato rimosso per permettere il match letterale (es. URI con punti o IP).
                 * IMPORTANTE: Se un Service decide di usare questo valore in un operatore $regex, 
                 * DEVE applicare escapeRegex() manualmente nel Service stesso per prevenire ReDoS.
                 */
                safe[key] = trimmed;
            }
        } else if (typeof value === 'boolean' || typeof value === 'number') {
            safe[key] = value;
        } else if (Array.isArray(value)) {
            // Supporto per array di stringhe (es. selectedUris)
            safe[key] = value
                .filter(v => typeof v === 'string')
                .map(v => (v as string).trim())
                .filter(v => v !== '');
        } else if (value && typeof value === 'object' && '$in' in value && Array.isArray((value as any).$in)) {
            safe[key] = { $in: (value as any).$in };
        }
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
    campaign: CAMPAIGN_SORT_FIELDS,
};

export const FilterAllowedFields = {
    threatLog: THREAT_LOG_FILTER_FIELDS,
    attack: ATTACK_FILTER_FIELDS,
    cowrieSession: COWRIE_SESSION_FILTER_FIELDS,
    campaign: CAMPAIGN_FILTER_FIELDS,
};