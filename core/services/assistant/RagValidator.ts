import { RagSearchOptions, RAG_SCHEMA_VERSION } from '../../types/assistant/rag.types';
import { sanitizeFilters, FilterAllowedFields } from '../../utils/queryGuard';

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
            return { valid: false, error: 'Il limite di ricerca deve essere compreso tra 1 e 50' };
        }
        if (options.scoreThreshold && (options.scoreThreshold < 0 || options.scoreThreshold > 1)) {
            return { valid: false, error: 'Il punteggio di soglia deve essere compreso tra 0 e 1' };
        }
        if (options.type && !['threat_log', 'attack_summary', 'campaign_summary', 'ip_details'].includes(options.type)) {
            return { valid: false, error: `Tipo di entità non supportato: ${options.type}` };
        }
        return { valid: true };
    }
    
    /**
     * Valida un riferimento sorgente (SourceRef).
     * Applica la sanitizzazione tramite QueryGuard per prevenire injection e ReDoS.
     */
    public static validateSourceRef(ref: any): { valid: boolean; error?: string; sanitizedParams?: any } {
        if (!ref || typeof ref !== 'object') {
            return { valid: false, error: 'SourceRef deve essere un oggetto' };
        }

        if (!ref.params || typeof ref.params !== 'object') {
            return { valid: false, error: 'SourceRef.params è obbligatorio e deve essere un oggetto' };
        }

        const type = ref.params.type;
        const validTypes = ['log', 'ip_details', 'attack', 'campaign'];

        if (!validTypes.includes(type)) {
            return { valid: false, error: `Tipo di sorgente non valido. Ammessi: ${validTypes.join(', ')}` };
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
                if (!ref.params.id) return { valid: false, error: 'ID mancante per il tipo log' };
                // I log usano la whitelist dei threatLog
                sanitized = {
                    ...sanitizeFilters(ref.params, FilterAllowedFields.threatLog),
                    type: 'log',
                    id: ref.params.id
                };
                break;

            case 'ip_details':
                if (!ref.params.ip) return { valid: false, error: 'IP mancante per il tipo ip_details' };
                // Gli IP dettagli non hanno filtri complessi, basta l'IP
                sanitized = { type: 'ip_details', ip: String(ref.params.ip).trim() };
                break;

            case 'attack':
                if (!ref.params.ip) return { valid: false, error: 'IP mancante per il tipo attack' };
                if (typeof ref.params.minLogsForAttack !== 'number') return { valid: false, error: 'minLogsForAttack non valido o mancante' };
                
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
                if (!ref.params.hash) return { valid: false, error: 'Hash campagna mancante' };
                
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

    /**
     * Restituisce lo schema dei parametri per l'Agente AI (usabile come tool definition).
     * Istruisce l'agente sui campi ammessi partendo dalle whitelist di QueryGuard.
     */
    public static getToolDefinition() {
        return {
            name: "resolve_threat_source",
            description: "Risolve un riferimento sorgente (sourceRef) recuperato da una ricerca semantica per ottenere i dati tecnici completi, originali e aggiornati (MongoDB).",
            parameters: {
                type: "object",
                properties: {
                    sourceRef: {
                        type: "object",
                        description: "L'oggetto sourceRef completo trovato nel metadato di un SearchHit. Passalo integralmente.",
                        properties: {
                            params: {
                                type: "object",
                                description: "Parametri tecnici di ricostruzione. NON inventare questi parametri, usali ESATTAMENTE come ricevuti dalla ricerca.",
                                oneOf: [
                                    {
                                        description: "Risoluzione Log atomico",
                                        properties: {
                                            type: { const: "log" },
                                            id: { type: "string", description: "ID univoco del log" }
                                        },
                                        required: ["type", "id"]
                                    },
                                    {
                                        description: "Dettagli reputazione IP",
                                        properties: {
                                            type: { const: "ip_details" },
                                            ip: { type: "string" }
                                        },
                                        required: ["type", "ip"]
                                    },
                                    {
                                        description: "Ricostruzione Attacco (Anomalia IP)",
                                        properties: {
                                            type: { const: "attack" },
                                            ip: { type: "string" },
                                            minLogsForAttack: { type: "number" },
                                            timeConfig: { 
                                                type: "object",
                                                properties: {
                                                    timeMode: { type: "string", enum: ["ago", "range"] },
                                                    agoValue: { type: "number" },
                                                    agoUnit: { type: "string" }
                                                }
                                            }
                                        },
                                        required: ["type", "ip", "minLogsForAttack"]
                                    },
                                    {
                                        description: "Ricostruzione Campagna (Cluster Fingerprint)",
                                        properties: {
                                            type: { const: "campaign" },
                                            hash: { type: "string" },
                                            minScore: { type: "number" },
                                            minLogsPerIp: { type: "number" },
                                            protocol: { type: "string" },
                                            timeConfig: { type: "object" }
                                        },
                                        required: ["type", "hash"]
                                    }
                                ]
                            }
                        },
                        required: ["params"]
                    }
                },
                required: ["sourceRef"]
            }
        };
    }
}
