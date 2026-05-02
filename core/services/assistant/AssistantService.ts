import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { 
    LOGGER_TOKEN, 
    QDRANT_CLIENT_TOKEN, 
    OLLAMA_SERVICE_TOKEN, 
    RAG_SYNC_SERVICE_TOKEN,
    I18N_TOKEN
} from '../../di/tokens';
import { QdrantClientService } from './QdrantClientService';
import { OllamaService } from './OllamaService';
import { RagSyncService } from './RagSyncService';
import { I18nService } from '../I18nService';
import { RagValidator } from './RagValidator';
import { ThreatLogService } from '../ThreatLogService';
import { CampaignService } from '../CampaignService';
import { IpDetailsService } from '../IpDetailsService';
import { 
    RagSearchHit, 
    RagAskResponse, 
    RagSearchOptions, 
    RagSourceRef,
    RagBasePayload,
    RAG_SCHEMA_VERSION
} from '../../types/assistant/rag.types';

@injectable()
export class AssistantService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(QDRANT_CLIENT_TOKEN) private readonly qdrant: QdrantClientService,
        @inject(OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService,
        @inject(RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService,
        @inject(I18N_TOKEN) private readonly i18n: I18nService,
        private readonly threatLogService: ThreatLogService,
        private readonly campaignService: CampaignService,
        private readonly ipDetailsService: IpDetailsService
    ) {}

    public async search(query: string, options: RagSearchOptions = {}): Promise<RagSearchHit[]> {
        const { limit = 5, scoreThreshold = 0.5, type } = options;
        
        // 1. Validare la richiesta di ricerca
        const validation = RagValidator.validateSearchOptions(options);
        if (!validation.valid) {
            throw new Error(validation.error || 'Parametri di ricerca non validi');
        }

        const status = this.ragSync.getStatus();
        if (!status.operational) {
            throw new Error(this.i18n.t('errors.rag.notOperational'));
        }

        this.logger.debug(`[AssistantService] Searching for: "${query}" (Type: ${type || 'all'})`);

        // 2. Chiamare Qdrant con collection e filtri coerenti
        const queryVector = await this.ollama.getEmbedding(query);
        
        // Determiniamo la collection corretta in base al tipo (se specificato)
        const collectionsToSearch = type === 'threat_log' 
            ? [this.ragSync.getStatus().logsCollection || 'threat_logs'] 
            : [this.ragSync.getStatus().intelligenceCollection || 'threat_intelligence'];

        // Se cerchiamo "tutto" (nessun tipo), potremmo voler cercare in entrambe o solo in intelligence
        // Per ora rispettiamo il comportamento precedente: default intelligence
        const collection = collectionsToSearch[0];
        
        const rawResults = await this.qdrant.search(collection, queryVector, limit);
        
        // 3. Validare il risultato raw, 4. Mappare in SearchHit, 5. Restituire oggetti normalizzati
        return rawResults
            .filter(r => {
                // Filtro coerenza RAG_POLICIES (Soglia punteggio vettoriale)
                return r.score >= scoreThreshold;
            })
            .filter(r => {
                // Filtro tipo (se richiesto specificamente dall'agente)
                return !type || r.payload?.type === type;
            })
            .map(r => {
                const payload = r.payload as unknown as RagBasePayload;
                
                // Validazione Payload Raw: evadiamo buchi di dati malformati o vecchi
                if (!payload?.text || !payload?.sourceRef) {
                    this.logger.warn(`[AssistantService] Malformed or legacy payload found for point ${r.id} - skipping`);
                    return null;
                }

                // Normalizzazione
                return {
                    id: r.id,
                    score: r.score,
                    text: payload.text,
                    sourceRef: payload.sourceRef
                };
            })
            .filter((h): h is RagSearchHit => h !== null);
    }

    /**
     * Risponde a una domanda basandosi sul contesto recuperato (RAG).
     */
    public async ask(question: string): Promise<RagAskResponse> {
        const hits = await this.search(question, { limit: 3, scoreThreshold: 0.4 });
        const contextText = hits.map(h => h.text).join('\n---\n');

        const prompt = `Sei un analista esperto di cybersecurity. Rispondi alla domanda dell'utente basandoti ESCLUSIVAMENTE sul contesto fornito sotto. Se il contesto non contiene informazioni sufficienti, dillo chiaramente.

Contesto di Threat Intelligence:
${contextText}

Domanda: ${question}
Risposta:`;

        const answer = await this.ollama.generate(prompt);

        return {
            question,
            answer,
            sources: hits
        };
    }

    /**
     * Il "Business Controller" / Dispatcher per la risoluzione delle sorgenti.
     * Permette all'Agente AI di "scendere nel tecnico" partendo da un hit semantico.
     */
    public async resolveSource(ref: RagSourceRef): Promise<any> {
        const validation = RagValidator.validateSourceRef(ref);
        if (!validation.valid) {
            throw new Error(validation.error || this.i18n.t('errors.rag.resolveError'));
        }

        const params = validation.sanitizedParams;
        this.logger.info(`[AssistantService] Resolving source for type: ${params.type}`);

        try {
            switch (params.type) {
                case 'log':
                    // Pass-through del DNA di ricostruzione
                    return await this.threatLogService.getLogById(params);
                
                case 'ip_details':
                    // Pass-through del DNA di ricostruzione
                    return await this.ipDetailsService.getIpDetails(params);
                
                case 'attack':
                    // Pass-through garantito dai tipi derivati
                    return await this.threatLogService.getAttackDetail(params);
                
                case 'campaign':
                    // Pass-through garantito dai tipi derivati
                    return await this.campaignService.getCampaignDetail(params);
                
                default:
                    const _exhaustive: never = params as never;
                    throw new Error(`Tipo di sorgente non supportato: ${JSON.stringify(_exhaustive)}`);
            }
        } catch (error: any) {
            this.logger.error(`[AssistantService] Source resolution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verifica l'integrità dello schema vettoriale e identifica punti obsoleti.
     * Utile per la manutenzione e il re-indexing.
     */
    public async checkSchemaIntegrity(collectionName: string): Promise<{ total: number, obsolete: number }> {
        let obsoleteCount = 0;
        let totalCount = 0;
        let offset: any = null;

        try {
            do {
                const result = await this.qdrant.scrollPoints(collectionName, { offset, limit: 100 });
                totalCount += result.points.length;

                for (const point of result.points) {
                    const payload = point.payload as any;
                    if (!payload || (payload.schemaVersion || 0) < RAG_SCHEMA_VERSION) {
                        obsoleteCount++;
                    }
                }

                offset = result.next_page_offset;
            } while (offset);

            return { total: totalCount, obsolete: obsoleteCount };
        } catch (error) {
            this.logger.error(`[AssistantService] Schema integrity check failed: ${error}`);
            throw error;
        }
    }
}
