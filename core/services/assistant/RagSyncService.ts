import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN, RAG_TRANSLATION_TOKEN, QDRANT_CLIENT_TOKEN, OLLAMA_SERVICE_TOKEN } from '../../di/tokens';
import { RagTranslationService } from './RagTranslationService';
import { QdrantClientService } from './QdrantClientService';
import { OllamaService } from './OllamaService';
import { AppConfigProvider } from '../AppConfigProvider';
import { IThreatLog } from '../../models/ThreatLogSchema';
import { IIpDetails } from '../../models/IpDetailsSchema';
import { IAbuseIpDb } from '../../models/AbuseIpDbSchema';
import { IAbuseReport } from '../../models/AbuseReportSchema';
import { stringToUuid } from '../../utils/uuid';
import { RAG_POLICIES } from './RagPolicies';
import { RagSourceRef, ThreatLogPayload, AttackSummaryPayload, CampaignSummaryPayload, AttackSourceParams, CampaignSourceParams, RAG_SCHEMA_VERSION, IpDetailsPayload } from '../../types/assistant/rag.types';
import AttackDTO from '../../models/dto/AttackDTO';
import CampaignDTO from '../../models/dto/CampaignDTO';
import { RAG_TEMPLATES } from './RagTemplates';

@injectable()
export class RagSyncService {
    private isOperational: boolean = false;
    private initializationAttempted: boolean = false;
    
    // Configurazione Batching per i Log
    private logBuffer: any[] = [];
    private readonly BATCH_SIZE = 10; // Processiamo 10 log alla volta
    private readonly BATCH_TIMEOUT = 30000; // O ogni 30 secondi
    private batchTimer: NodeJS.Timeout | null = null;

    private readonly COLL_INTELLIGENCE: string;
    private readonly COLL_LOGS: string;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(RAG_TRANSLATION_TOKEN) private readonly translator: RagTranslationService,
        @inject(QDRANT_CLIENT_TOKEN) private readonly qdrant: QdrantClientService,
        @inject(OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService,
        private readonly config: AppConfigProvider
    ) { 
        this.COLL_INTELLIGENCE = this.config.ragCollectionName;
        this.COLL_LOGS = this.config.ragLogsCollectionName;
    }

    /**
     * Sincronizza un ThreatLog nel database vettoriale (con Filtro e Batching).
     */
    public async syncThreatLog(log: IThreatLog) {
        // LOG VISIBILE: Vediamo se il log arriva al sistema RAG (prima del check operativo)
        const score = log.fingerprint?.score || 0;
        const ip = log.request?.ip || 'N/A';
        this.logger.info(`[RagSync] Received log for IP ${ip} (Score: ${score})`);

        if (!this.checkOperational()) {
            this.logger.debug(`[RagSync] Skipping processing for IP ${ip}: system not operational (Ollama/Qdrant down)`);
            return;
        }

        // FILTRO: Ignoriamo i log con score basso
        if (score < RAG_POLICIES.LOGS.minScore) {
            this.logger.info(`[RagSync] Log filtered out (Score ${score} < ${RAG_POLICIES.LOGS.minScore})`);
            return;
        }

        try {
            // Aggiungiamo al buffer per processamento batch
            this.logBuffer.push(log);
            this.logger.debug(`[RagSync] Log added to buffer (${this.logBuffer.length}/${this.BATCH_SIZE})`);

            if (this.logBuffer.length >= this.BATCH_SIZE) {
                await this.flushLogBuffer();
            } else if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => this.flushLogBuffer(), this.BATCH_TIMEOUT);
            }
        } catch (error) {
            this.handleOperationError('syncThreatLog', error);
        }
    }

    /**
     * Svuota il buffer dei log e li invia a Qdrant in blocco.
     */
    private async flushLogBuffer() {
        if (this.logBuffer.length === 0) return;
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        const logsToProcess = [...this.logBuffer];
        this.logBuffer = [];

        this.logger.info(`[RagSync] Flushing ${logsToProcess.length} logs to Qdrant...`);

        try {
            const points = [];
            for (const log of logsToProcess) {
                const narrative = this.translator.translateThreatLog(log);
                const vector = await this.ollama.getEmbedding(narrative);
                
                const payload: ThreatLogPayload = {
                    type: 'threat_log',
                    mongoId: log._id.toString(),
                    ip: log.request?.ip || 'N/A',
                    timestamp: log.timestamp,
                    score: log.fingerprint?.score || 0,
                    text: narrative,
                    materializedAt: new Date(),
                    schemaVersion: RAG_SCHEMA_VERSION,
                    sourceRef: {
                        endpoint: RAG_POLICIES.LOGS.apiRef.endpoint.replace(':id', log._id.toString()),
                        method: RAG_POLICIES.LOGS.apiRef.method,
                        params: { type: 'log', id: log._id.toString() }
                    },
                    // Campi DTO estesi
                    protocol: log.protocol,
                    geo: log.geo,
                    fingerprint: log.fingerprint,
                    request: {
                        method: log.request?.method,
                        url: log.request?.url,
                        ip: log.request?.ip
                    }
                };

                points.push({
                    id: stringToUuid(log._id.toString()),
                    vector: vector,
                    payload
                });
            }

            if (points.length > 0) {
                await this.qdrant.upsertPoints(this.COLL_LOGS, points);
            }
        } catch (error) {
            this.logger.error(`[RagSync] Failed to flush log buffer: ${error.message}`);
        }
    }

    /**
     * Sincronizza IpDetails nel database vettoriale.
     */
    public async syncIpDetails(ipDetails: IIpDetails, abuseData?: IAbuseIpDb | null, abuseReports?: IAbuseReport[]) {
        if (!this.checkOperational()) return;

        try {
            this.logger.debug(`[RagSync] Syncing IpDetails for ${ipDetails.ip}`);

            // 1. Traduzione
            const narrative = this.translator.translateIpDetails(ipDetails, abuseData, abuseReports);

            // 2. Embedding
            const vector = await this.ollama.getEmbedding(narrative);

            // 3. Upsert su Qdrant
            const payload: IpDetailsPayload = {
                type: 'ip_details',
                mongoId: ipDetails._id.toString(),
                ip: ipDetails.ip,
                lastSeen: ipDetails.lastSeenAt,
                text: narrative,
                materializedAt: new Date(),
                schemaVersion: RAG_SCHEMA_VERSION,
                sourceRef: {
                    endpoint: RAG_POLICIES.IP_DETAILS.apiRef.endpoint,
                    method: RAG_POLICIES.IP_DETAILS.apiRef.method,
                    params: {
                        type: 'ip_details',
                        ip: ipDetails.ip
                    }
                },
                // Campi DTO estesi
                firstSeenAt: ipDetails.firstSeenAt,
                lastSeenAt: ipDetails.lastSeenAt,
                enrichedAt: ipDetails.enrichedAt,
                ipinfo: ipDetails.ipinfo
            };

            await this.qdrant.upsertPoints(this.COLL_INTELLIGENCE, [{
                id: stringToUuid(ipDetails._id.toString()),
                vector: vector,
                payload
            }]);
        } catch (error) {
            this.handleOperationError('syncIpDetails', error);
        }
    }

    /**
     * Materializza un singolo riassunto di campagna.
     * Gestisce traduzione, generazione AI (opzionale) e sync.
     */
    public async materializeCampaign(campaign: CampaignDTO, options: { isAiEnabled?: boolean } = {}) {
        try {
            this.logger.debug(`[RagSync] Materializing summary for campaign: ${campaign.hash}`);
            
            // 1. Narrazione Tecnica (Deterministica)
            const technicalNarrative = this.translator.translateCampaign(campaign);
            let finalContent = technicalNarrative;

            // 2. Generazione AI (Opzionale)
            if (options.isAiEnabled) {
                try {
                    const prompt = this.translator.buildCampaignSummaryPrompt(campaign);
                    const aiSummary = await this.ollama.generate(prompt);
                    finalContent = RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.PROMPTS.CAMPAIGN_REPORT_LABEL, {
                        aiSummary,
                        technicalNarrative
                    });
                } catch (aiErr) {
                    this.logger.warn(`[RagSync] AI Generation failed for campaign ${campaign.hash}, falling back to technical data: ${aiErr.message}`);
                }
            }
            
            // 3. Embedding
            const vector = await this.ollama.getEmbedding(finalContent);
            
            // 4. Source Reference per la tracciabilità agentica
            const params: CampaignSourceParams = { 
                type: 'campaign',
                hash: campaign.hash,
                minScore: RAG_POLICIES.CAMPAIGNS.minScore,
                minLogsPerIp: RAG_POLICIES.CAMPAIGNS.minLogsPerIp,
                protocol: RAG_POLICIES.CAMPAIGNS.protocol,
                timeConfig: RAG_POLICIES.CAMPAIGNS.timeConfig as any
            };

            const sourceRef: RagSourceRef = {
                endpoint: RAG_POLICIES.CAMPAIGNS.apiRef.endpoint,
                method: RAG_POLICIES.CAMPAIGNS.apiRef.method,
                params
            };
            
            await this.syncCampaignSummary(campaign, finalContent, vector, sourceRef);
            return true;
        } catch (error) {
            this.logger.error(`[RagSync] Error materializing campaign ${campaign.hash}: ${error.message}`);
            return false;
        }
    }

    /**
     * Materializza un singolo riassunto di attacco (IP-centrico).
     * Gestisce traduzione, generazione AI (opzionale) e sync.
     */
    public async materializeAttack(attack: AttackDTO, options: { isAiEnabled?: boolean } = {}) {
        const ip = attack.request?.ip || attack.ip || 'N/A';
        try {
            this.logger.debug(`[RagSync] Materializing summary for attack by IP: ${ip}`);

            // 1. Narrazione Tecnica (Deterministica)
            const technicalNarrative = this.translator.translateAttack(attack);
            let finalContent = technicalNarrative;

            // 2. Generazione AI (Opzionale)
            if (options.isAiEnabled) {
                try {
                    const prompt = this.translator.buildAttackSummaryPrompt(attack);
                    const aiSummary = await this.ollama.generate(prompt);
                    finalContent = RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.PROMPTS.ATTACK_REPORT_LABEL, {
                        aiSummary,
                        technicalNarrative
                    });
                } catch (aiErr) {
                    this.logger.warn(`[RagSync] AI Generation failed for IP ${ip}, falling back to technical data: ${aiErr.message}`);
                }
            }

            // 3. Embedding
            const vector = await this.ollama.getEmbedding(finalContent);

            // 4. Source Reference per la tracciabilità agentica
            const params: AttackSourceParams = { 
                type: 'attack',
                ip: ip,
                minLogsForAttack: RAG_POLICIES.ATTACKS.minLogs,
                timeConfig: RAG_POLICIES.ATTACKS.timeConfig as any
            };

            const sourceRef: RagSourceRef = {
                endpoint: RAG_POLICIES.ATTACKS.apiRef.endpoint,
                method: RAG_POLICIES.ATTACKS.apiRef.method,
                params
            };

            await this.syncAttackSummary(attack, finalContent, vector, sourceRef);
            return true;
        } catch (error) {
            this.logger.error(`[RagSync] Error materializing attack for IP ${ip}: ${error.message}`);
            return false;
        }
    }

    /**
     * Sincronizza un riassunto di campagna nel database vettoriale.
     */
    public async syncCampaignSummary(campaign: any, aiSummary: string, vector: number[], sourceRef?: RagSourceRef) {
        if (!this.checkOperational()) return;

        try {
            this.logger.debug(`[RagSync] Syncing Campaign Summary for ${campaign.hash}`);

            const payload: CampaignSummaryPayload = {
                type: 'campaign_summary',
                campaignId: campaign.hash,
                ipCount: campaign.ipCount,
                topIps: campaign.topIps || [],
                protocols: campaign.protocols || [],
                text: aiSummary,
                materializedAt: new Date(),
                schemaVersion: RAG_SCHEMA_VERSION,
                sourceRef: sourceRef || {
                    endpoint: RAG_POLICIES.CAMPAIGNS.apiRef.endpoint,
                    method: RAG_POLICIES.CAMPAIGNS.apiRef.method,
                    params: { 
                        type: 'campaign',
                        hash: campaign.hash,
                        minScore: RAG_POLICIES.CAMPAIGNS.minScore,
                        minLogsPerIp: RAG_POLICIES.CAMPAIGNS.minLogsPerIp,
                        protocol: RAG_POLICIES.CAMPAIGNS.protocol,
                        timeConfig: RAG_POLICIES.CAMPAIGNS.timeConfig as any
                    }
                },
                // Campi DTO estesi
                totaleLogs: campaign.totaleLogs,
                averageScore: campaign.averageScore,
                firstSeen: campaign.firstSeen,
                lastSeen: campaign.lastSeen
            };

            await this.qdrant.upsertPoints(this.COLL_INTELLIGENCE, [{
                id: stringToUuid(`campaign-${campaign.hash}`),
                vector: vector,
                payload
            }]);
        } catch (error) {
            this.handleOperationError('syncCampaignSummary', error);
        }
    }

    /**
     * Sincronizza un riassunto di attacco (IP-centrico) nel database vettoriale.
     */
    public async syncAttackSummary(attack: AttackDTO, aiSummary: string, vector: number[], sourceRef?: RagSourceRef) {
        if (!this.checkOperational()) return;

        try {
            const ip = attack.request?.ip || attack.ip;
            this.logger.debug(`[RagSync] Syncing Attack Summary for IP ${ip}`);

            const payload: AttackSummaryPayload = {
                ...attack, // Includiamo tutto l'AttackDTO
                type: 'attack_summary',
                ip: ip as string,
                totaleLogs: attack.totaleLogs || 0,
                averageScore: attack.averageScore || 0,
                text: aiSummary,
                materializedAt: new Date(),
                schemaVersion: RAG_SCHEMA_VERSION,
                sourceRef: sourceRef || {
                    endpoint: RAG_POLICIES.ATTACKS.apiRef.endpoint,
                    method: RAG_POLICIES.ATTACKS.apiRef.method,
                    params: { 
                        type: 'attack',
                        ip: ip as string,
                        minLogsForAttack: RAG_POLICIES.ATTACKS.minLogs,
                        timeConfig: RAG_POLICIES.ATTACKS.timeConfig as any
                    }
                }
            };

            await this.qdrant.upsertPoints(this.COLL_INTELLIGENCE, [{
                id: stringToUuid(`attack-${ip}`),
                vector: vector,
                payload
            }]);
        } catch (error) {
            this.handleOperationError('syncAttackSummary', error);
        }
    }

    /**
     * Inizializza il sistema RAG con controllo di integrità.
     */
    public async initialize() {
        if (!this.config.ragEnabled) {
            this.logger.info('[RagSync] RAG system is disabled via configuration.');
            this.initializationAttempted = true;
            this.isOperational = false;
            return;
        }

        this.initializationAttempted = true;
        this.logger.info('[RagSync] Initializing RAG Synchronization system...');

        try {
            // Inizializza le collection necessarie
            await this.qdrant.initializeCollection(this.COLL_INTELLIGENCE, 768);
            await this.qdrant.initializeCollection(this.COLL_LOGS, 768);

            // Verifica connettività Ollama
            const ollamaOk = await this.ollama.checkHealth();
            if (!ollamaOk) {
                throw new Error('Ollama service is unreachable');
            }

            this.isOperational = true;
            this.logger.info('[RagSync] RAG system is fully operational and connected to Ollama.');
        } catch (error) {
            this.isOperational = false;
            this.logger.error(`[RagSync] CRITICAL: RAG system is NOT operational: ${error.message}`);
        }
    }

    private checkOperational(): boolean {
        if (!this.config.ragEnabled) return false;
        if (!this.initializationAttempted) return false;
        return this.isOperational;
    }

    private handleOperationError(operation: string, error: any) {
        this.logger.error(`[RagSync] Error during ${operation}: ${error.message}`);
        // Se riceviamo troppi errori consecutivi, potremmo disattivare il sistema temporaneamente
    }

    public getStatus() {
        return {
            operational: this.isOperational,
            initializationAttempted: this.initializationAttempted,
            enabled: this.config.ragEnabled,
            intelligenceCollection: this.COLL_INTELLIGENCE,
            logsCollection: this.COLL_LOGS
        };
    }

    /**
     * Ferma eventuali timer attivi.
     */
    public stop() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }
}
