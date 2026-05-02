import { RagSearchOptions } from '../../types/assistant/rag.types';

/**
 * Helper per la validazione a runtime delle strutture RAG.
 * Garantisce che l'Agente AI e il sistema di risoluzione ricevano dati coerenti.
 */
export class RagValidator {
    
    /**
     * Valida le opzioni di ricerca.
     */
    public static validateSearchOptions(options: RagSearchOptions): { valid: boolean; error?: string } {
        if (options.limit && (options.limit < 1 || options.limit > 50)) {
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
     */
    public static validateSourceRef(ref: any): { valid: boolean; error?: string } {
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

        // Validazione specifica per i parametri di ricostruzione
        switch (type) {
            case 'log':
                if (!ref.params.id) return { valid: false, error: 'ID mancante per il tipo log' };
                break;
            case 'ip_details':
                if (!ref.params.ip) return { valid: false, error: 'IP mancante per il tipo ip_details' };
                break;
            case 'attack':
                if (!ref.params.ip) return { valid: false, error: 'IP mancante per il tipo attack' };
                if (typeof ref.params.minLogsForAttack !== 'number') return { valid: false, error: 'minLogsForAttack non valido o mancante' };
                if (!ref.params.timeConfig) return { valid: false, error: 'timeConfig mancante per la ricostruzione dell\'attacco' };
                break;
            case 'campaign':
                if (!ref.params.hash) return { valid: false, error: 'Hash campagna mancante' };
                if (typeof ref.params.minScore !== 'number') return { valid: false, error: 'minScore non valido' };
                if (!ref.params.timeConfig) return { valid: false, error: 'timeConfig mancante per la ricostruzione della campagna' };
                break;
        }

        return { valid: true };
    }

    /**
     * Restituisce lo schema dei parametri per l'Agente AI (usabile come tool definition).
     */
    public static getToolDefinition() {
        return {
            name: "resolve_threat_source",
            description: "Risolve un riferimento sorgente (sourceRef) recuperato da una ricerca semantica per ottenere i dati tecnici completi e originali.",
            parameters: {
                type: "object",
                properties: {
                    sourceRef: {
                        type: "object",
                        description: "L'oggetto sourceRef completo trovato nel metadato di un SearchHit",
                        properties: {
                            params: {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["log", "ip_details", "attack", "campaign"] }
                                },
                                required: ["type"]
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
