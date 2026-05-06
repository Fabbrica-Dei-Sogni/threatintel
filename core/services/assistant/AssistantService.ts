import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { QdrantClientService } from './QdrantClientService';
import { OllamaService } from './OllamaService';
import { RagSyncService } from './RagSyncService';
import { I18nService } from '../I18nService';
import { RagValidator } from './RagValidator';
import { ThreatLogService } from '../ThreatLogService';
import { AttackLogService } from '../AttackLogService';
import { CampaignService } from '../CampaignService';
import { IpDetailsService } from '../IpDetailsService';
import { RAG_TEMPLATES } from './RagTemplates';
import {
    RagSearchHit,
    RagAskResponse,
    RagSearchOptions,
    RagSourceRef,
    RagBasePayload,
    RAG_SCHEMA_VERSION,
    DirectSearchHit,
    SearchResponse
} from '../../types/assistant/rag.types';
import { GetAttacksParams, GetCampaignsParams, GetThreatLogParams } from '../../types/service-params.types';
import { SearchAttacksArgs, SearchCampaignsArgs, SearchLogArgs } from '../../types/assistant/assistant-tool.types';
import { RagTranslationService } from './RagTranslationService';

import * as Tokens from '../../di/tokens';

@injectable()
export class AssistantService {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.QDRANT_CLIENT_TOKEN) private readonly qdrant: QdrantClientService,
        @inject(Tokens.OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService,
        @inject(Tokens.RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService,
        @inject(Tokens.I18N_TOKEN) private readonly i18n: I18nService,
        @inject(Tokens.THREAT_LOG_SERVICE_TOKEN) private readonly threatLogService: ThreatLogService,
        @inject(Tokens.ATTACK_LOG_SERVICE_TOKEN) private readonly attackLogService: AttackLogService,
        @inject(Tokens.CAMPAIGN_SERVICE_TOKEN) private readonly campaignService: CampaignService,
        @inject(Tokens.IP_DETAILS_SERVICE_TOKEN) private readonly ipDetailsService: IpDetailsService,
        @inject(Tokens.RAG_TRANSLATION_TOKEN) private readonly ragTranslation: RagTranslationService,

    ) { }

    public async search(query: string, options: RagSearchOptions = {}): Promise<RagSearchHit[]> {
        const { limit = 5, scoreThreshold = 0.5, type, sortBy, sortOrder = 'desc', status: searchStatus } = options;

        // 1. Validare la richiesta di ricerca
        const validation = RagValidator.validateSearchOptions(options);
        if (!validation.valid) {
            throw new Error(validation.error || 'Parametri di ricerca non validi');
        }

        const ragStatus = this.ragSync.getStatus();
        if (!ragStatus.operational) {
            throw new Error(this.i18n.t('errors.rag.notOperational'));
        }

        this.logger.debug(`[AssistantService] Searching for: "${query}" (Type: ${type || 'all'}, Status: ${searchStatus || 'active'})`);

        // 2. Chiamare Qdrant con collection e filtri coerenti
        const queryVector = await this.ollama.getEmbedding(query);

        // Costruzione Filtro Qdrant
        const filter: any = { must: [] };

        // Filtro Status (Fallback active/null)
        if (!searchStatus || searchStatus === 'active') {
            filter.must.push({
                should: [
                    { key: 'status', match: { value: 'active' } },
                    { is_empty: { key: 'status' } }
                ]
            });
        } else {
            filter.must.push({ key: 'status', match: { value: searchStatus } });
        }

        // Determiniamo la collection corretta in base al tipo (se specificato)
        const collectionsToSearch = type === 'threat_log'
            ? [ragStatus.logsCollection || 'threat_logs']
            : [ragStatus.intelligenceCollection || 'threat_intelligence'];

        const collection = collectionsToSearch[0];

        const rawResults = await this.qdrant.search(collection, queryVector, limit, filter);

        // 3. Validare il risultato raw, 4. Mappare in SearchHit, 5. Restituire oggetti normalizzati
        const hits = rawResults
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
                    sourceRef: payload.sourceRef,
                    // Includiamo il payload originale per permettere l'ordinamento post-recupero
                    _rawPayload: payload
                };
            })
            .filter((h): h is any => h !== null);

        // 6. Ordinamento post-recupero se richiesto
        if (sortBy) {
            hits.sort((a: any, b: any) => {
                const valA = a._rawPayload[sortBy];
                const valB = b._rawPayload[sortBy];

                if (valA === undefined || valB === undefined) return 0;

                // Gestione date
                if (valA instanceof Date && valB instanceof Date) {
                    return sortOrder === 'asc'
                        ? valA.getTime() - valB.getTime()
                        : valB.getTime() - valA.getTime();
                }

                // Gestione stringhe e numeri
                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Rimuoviamo il payload raw prima di restituire i risultati all'agente
        return hits.map(({ _rawPayload, ...hit }) => hit);
    }

    /**
     * Risponde a una domanda basandosi sul contesto recuperato (RAG).
     */
    public async ask(question: string): Promise<RagAskResponse> {
        const hits = await this.search(question, { limit: 3, scoreThreshold: 0.4 });
        const contextText = hits.map(h => h.text).join('\n---\n');

        const prompt = RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.PROMPTS.ASK_SYSTEM, {
            contextText,
            question
        });

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
                    return await this.attackLogService.getAttackDetail(params);

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

    public async searchLogs(args: SearchLogArgs): Promise<SearchResponse<DirectSearchHit>> {
        const serviceParams: GetThreatLogParams = {
            pageSize: args.limit || 20,
            page: (args.offset && args.limit) ? Math.floor(args.offset / args.limit) + 1 : 1,
            filters: {
                'request.ip': args.ip,
                'request.url': args.url,
                protocol: args.protocol,
                status: args.status
            }
        };

        if (args.startDate || args.endDate) {
            serviceParams.timeConfig = {
                startTime: args.startDate instanceof Date ? args.startDate.toISOString() : args.startDate,
                endTime: args.endDate instanceof Date ? args.endDate.toISOString() : args.endDate
            };
        }

        const { logs, total, page, pageSize } = await this.threatLogService.searchLogs(serviceParams);

        return {
            items: logs.map(log => ({
                id: log.id,
                score: 1.0,
                text: this.ragTranslation.translateThreatLog(log),
                summary: {
                    id: log.id,
                    ip: log.request?.ip,
                    protocol: log.protocol,
                    timestamp: log.timestamp,
                    url: log.request?.url,
                    score: log.fingerprint?.score
                },
                resolveRef: {
                    endpoint: `/api/logs/${log.id}`,
                    method: 'GET',
                    params: { id: log.id, type: 'log' }
                }
            })),
            total,
            page,
            pageSize
        };
    }

    public async searchAttacks(args: SearchAttacksArgs): Promise<SearchResponse<DirectSearchHit>> {
        const serviceParams: GetAttacksParams = {
            pageSize: args.limit || 20,
            page: (args.offset && args.limit) ? Math.floor(args.offset / args.limit) + 1 : 1,
            minLogsForAttack: args.minLogs || 10,
            sortFields: args.sortBy ? { [args.sortBy]: args.sortOrder === 'asc' ? 1 : -1 } : { lastSeen: -1 },
            timeConfig: (args.dateFrom || args.dateTo) ? {
                startTime: args.dateFrom,
                endTime: args.dateTo,
                timeMode: 'range'
            } : {},
            filters: {
                'request.ip': args.ip,
                country: args.country,
                protocol: args.protocol,
                dangerScore: args.dangerScore,
                status: args.status
            }
        };

        const result = await this.attackLogService.getAttacks(serviceParams);
        const pNum = serviceParams.page || 1;
        const psNum = serviceParams.pageSize || 20;

        return {
            items: result.items.map((attack: any) => {
                const attackIp = attack.ip || attack.request?.ip;

                return {
                    id: attackIp,
                    score: attack.dangerScore ?? attack.averageScore ?? 0,
                    text: this.ragTranslation.translateAttack(attack),
                    summary: {
                        ip: attackIp,
                        country: attack.geo?.country,
                        protocol: attack.protocol,
                        dangerScore: attack.dangerScore,
                        totaleLogs: attack.totaleLogs,
                        firstSeen: attack.firstSeen,
                        lastSeen: attack.lastSeen,
                        attackPatterns: attack.attackPatterns,
                    },
                    resolveRef: {
                        endpoint: '/api/attack/details',
                        method: 'POST',
                        params: {
                            type: 'attack',
                            ip: attackIp,
                            minLogsForAttack: args.minLogs || 10
                        } as any,
                    },
                };
            }),
            total: result.totalCount,
            page: pNum,
            pageSize: psNum
        };
    }

    public async searchCampaigns(args: SearchCampaignsArgs): Promise<SearchResponse<DirectSearchHit>> {
        const serviceParams: GetCampaignsParams = {
            pageSize: args.limit || 20,
            page: (args.offset && args.limit) ? Math.floor(args.offset / args.limit) + 1 : 1,
            minIps: args.minIps || 2,
            minScore: args.minScore || 0,
            minLogsPerIp: args.minLogsPerIp || 1,
            protocol: args.protocol as any,
            timeConfig: (args.dateFrom || args.dateTo) ? {
                startTime: args.dateFrom,
                endTime: args.dateTo,
                timeMode: 'range'
            } : {},
            status: args.status
        };

        const result = await this.campaignService.getCampaigns(serviceParams);

        return {
            items: result.campaigns.map((campaign: any) => ({
                id: campaign.hash,
                score: campaign.averageScore ?? 0,
                text: this.ragTranslation.translateCampaign(campaign),
                summary: {
                    hash: campaign.hash,
                    ipCount: campaign.ipCount,
                    protocol: campaign.protocol,
                    totaleLogs: campaign.totaleLogs,
                    averageScore: campaign.averageScore,
                    firstSeen: campaign.firstSeen,
                    lastSeen: campaign.lastSeen,
                    attackPatterns: campaign.attackPatterns,
                },
                resolveRef: {
                    endpoint: '/api/campaign/detail',
                    method: 'POST',
                    params: {
                        type: 'campaign',
                        hash: campaign.hash,
                        minLogsPerIp: args.minLogsPerIp || 1,
                        minScore: args.minScore || 0
                    } as any,
                },
            })),
            total: result.total,
            page: serviceParams.page || 1,
            pageSize: serviceParams.pageSize || 20
        };
    }

    public async getStats(timeframe?: string, minScore?: number, limit?: number, minLogs?: number): Promise<any> {
        return this.threatLogService.getStats(timeframe, minScore, limit, minLogs);
    }
}
