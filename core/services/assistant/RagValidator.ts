import { RagSearchOptions, RAG_SCHEMA_VERSION } from '../../types/assistant/rag.types';
import { sanitizeFilters, FilterAllowedFields } from '../../utils/queryGuard';
import { RAG_TEMPLATES } from './RagTemplates';

/**
 * Helper per la validazione a runtime delle strutture RAG.
 * Garantisce che l'Agente AI e il sistema di risoluzione ricevano dati coerenti.
 * Integra la logica di QueryGuard per la sicurezza e la sanitizzazione.
 */
export class RagValidator {
    
    /**
     * Valida le opzioni di ricerca.
     */
    public static validateSearchOptions(options: RagSearchOptions): { valid: boolean; error?: string } {
        if (options.limit !== undefined && (options.limit < 1 || options.limit > 50)) {
            return { valid: false, error: RAG_TEMPLATES.VALIDATION.LIMIT_RANGE };
        }
        if (options.scoreThreshold && (options.scoreThreshold < 0 || options.scoreThreshold > 1)) {
            return { valid: false, error: RAG_TEMPLATES.VALIDATION.SCORE_THRESHOLD_RANGE };
        }
        if (options.type && !['threat_log', 'attack_summary', 'campaign_summary', 'ip_details'].includes(options.type)) {
            return { valid: false, error: RAG_TEMPLATES.VALIDATION.ENTITY_TYPE_NOT_SUPPORTED.replace('{type}', options.type) };
        }
        if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) {
            return { valid: false, error: RAG_TEMPLATES.VALIDATION.SORT_ORDER_INVALID };
        }
        if (options.status && !['active', 'archived', 'deleted'].includes(options.status)) {
            return { valid: false, error: 'Stato non supportato' };
        }
        return { valid: true };
    }
    
    /**
     * Valida un riferimento sorgente (SourceRef).
     * Applica la sanitizzazione tramite QueryGuard per prevenire injection e ReDoS.
     */
    public static validateSourceRef(ref: any): { valid: boolean; error?: string; sanitizedParams?: any } {
        if (!ref || typeof ref !== 'object') {
            return { valid: false, error: RAG_TEMPLATES.VALIDATION.SOURCE_REF_REQUIRED };
        }

        if (!ref.params || typeof ref.params !== 'object') {
            return { valid: false, error: RAG_TEMPLATES.VALIDATION.SOURCE_REF_PARAMS_REQUIRED };
        }

        const type = ref.params.type;
        const validTypes = ['log', 'ip_details', 'attack', 'campaign'];

        if (!validTypes.includes(type)) {
            return { valid: false, error: RAG_TEMPLATES.VALIDATION.SOURCE_TYPE_INVALID.replace('{types}', validTypes.join(', ')) };
        }

        // Verifica versione schema (Fase 2)
        // Se il riferimento è troppo vecchio, potremmo segnalarlo, 
        // ma per ora permettiamo la risoluzione per retrocompatibilità "best-effort"
        const schemaVersion = ref.schemaVersion || 1;
        if (schemaVersion < RAG_SCHEMA_VERSION) {
            // Loggare internamente il potenziale drift
        }

        let sanitized: any = { ...ref.params };

        // Validazione e Sanitizzazione specifica per i parametri di ricostruzione
        switch (type) {
            case 'log':
                if (!ref.params.id) return { valid: false, error: RAG_TEMPLATES.VALIDATION.MISSING_ID };
                // I log usano la whitelist dei threatLog
                sanitized = {
                    ...sanitizeFilters(ref.params, FilterAllowedFields.threatLog),
                    type: 'log',
                    id: ref.params.id
                };
                break;

            case 'ip_details':
                if (!ref.params.ip) return { valid: false, error: RAG_TEMPLATES.VALIDATION.MISSING_IP.replace('{type}', 'ip_details') };
                // Gli IP dettagli non hanno filtri complessi, basta l'IP
                sanitized = { type: 'ip_details', ip: String(ref.params.ip).trim() };
                break;

            case 'attack':
                if (!ref.params.ip) return { valid: false, error: RAG_TEMPLATES.VALIDATION.MISSING_IP.replace('{type}', 'attack') };
                if (typeof ref.params.minLogsForAttack !== 'number') return { valid: false, error: RAG_TEMPLATES.VALIDATION.INVALID_MIN_LOGS };
                
                // Sanitizzazione tramite QueryGuard (Whitelist degli attacchi)
                sanitized = {
                    ...sanitizeFilters(ref.params, FilterAllowedFields.attack),
                    type: 'attack',
                    ip: ref.params.ip,
                    minLogsForAttack: ref.params.minLogsForAttack,
                    timeConfig: ref.params.timeConfig // Il timeConfig viene validato internamente dai service
                };
                break;

            case 'campaign':
                if (!ref.params.hash) return { valid: false, error: RAG_TEMPLATES.VALIDATION.MISSING_HASH };
                
                // Sanitizzazione tramite QueryGuard (Whitelist delle campagne)
                sanitized = {
                    ...sanitizeFilters(ref.params, FilterAllowedFields.campaign),
                    type: 'campaign',
                    hash: ref.params.hash,
                    timeConfig: ref.params.timeConfig
                };
                break;
        }

        return { valid: true, sanitizedParams: sanitized };
    }
}
