import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN, RAG_TRANSLATION_TOKEN, QDRANT_CLIENT_TOKEN, OLLAMA_SERVICE_TOKEN } from '../../di/tokens';
import { RagTranslationService } from './RagTranslationService';
import { QdrantClientService } from './QdrantClientService';
import { OllamaService } from './OllamaService';
import { IThreatLog } from '../../models/ThreatLogSchema';
import { IIpDetails } from '../../models/IpDetailsSchema';
import { IAbuseIpDb } from '../../models/AbuseIpDbSchema';
import { IAbuseReport } from '../../models/AbuseReportSchema';
import { stringToUuid } from '../../utils/uuid';
import { RAG_POLICIES } from './RagPolicies';
import { RagSourceRef, ThreatLogPayload, AttackSummaryPayload, CampaignSummaryPayload } from '../../types/assistant/rag.types';

@injectable()
export class RagSyncService {
    private isOperational: boolean = false;
    private initializationAttempted: boolean = false;
    
    // Configurazione Batching per i Log
    private logBuffer: any[] = [];
    private readonly BATCH_SIZE = 10; // Processiamo 10 log alla volta
    private readonly BATCH_TIMEOUT = 30000; // O ogni 30 secondi
    private batchTimer: NodeJS.Timeout | null = null;

    private readonly COLL_INTELLIGENCE = 'threat_intelligence';
    private readonly COLL_LOGS = 'threat_logs';

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(RAG_TRANSLATION_TOKEN) private readonly translator: RagTranslationService,
        @inject(QDRANT_CLIENT_TOKEN) private readonly qdrant: QdrantClientService,
        @inject(OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService
    ) { }

    /**
     * Sincronizza un ThreatLog nel database vettoriale (con Filtro e Batching).
     */
    public async syncThreatLog(log: IThreatLog) {
        if (!this.checkOperational()) return;

        // LOG VISIBILE: Vediamo se il log arriva al sistema RAG
        const score = log.fingerprint?.score || 0;
        this.logger.info(`[RagSync] Received log for IP ${log.request?.ip} (Score: ${score})`);

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
                    sourceRef: {
                        endpoint: RAG_POLICIES.LOGS.apiRef.endpoint.replace(':id', log._id.toString()),
                        method: RAG_POLICIES.LOGS.apiRef.method,
                        params: { type: 'log', id: log._id.toString() }
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
            await this.qdrant.upsertPoints(this.COLL_INTELLIGENCE, [{
                id: stringToUuid(ipDetails._id.toString()),
                vector: vector,
                payload: {
                    type: 'ip_details',
                    mongoId: ipDetails._id.toString(),
                    ip: ipDetails.ip,
                    lastSeen: ipDetails.lastSeenAt,
                    text: narrative
                }
            }]);
        } catch (error) {
            this.handleOperationError('syncIpDetails', error);
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
                sourceRef: sourceRef || {
                    endpoint: RAG_POLICIES.CAMPAIGNS.apiRef.endpoint,
                    method: RAG_POLICIES.CAMPAIGNS.apiRef.method,
                    params: { 
                        type: 'campaign',
                        campaignId: campaign.hash,
                        minIps: RAG_POLICIES.CAMPAIGNS.minIps,
                        minScore: RAG_POLICIES.CAMPAIGNS.minScore,
                        minLogsPerIp: RAG_POLICIES.CAMPAIGNS.minLogsPerIp,
                        protocol: RAG_POLICIES.CAMPAIGNS.protocol,
                        timeWindow: RAG_POLICIES.CAMPAIGNS.timeWindow
                    }
                }
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
    public async syncAttackSummary(attack: any, aiSummary: string, vector: number[], sourceRef?: RagSourceRef) {
        if (!this.checkOperational()) return;

        try {
            const ip = attack.request?.ip || attack.ip;
            this.logger.debug(`[RagSync] Syncing Attack Summary for IP ${ip}`);

            const payload: AttackSummaryPayload = {
                type: 'attack_summary',
                ip: ip,
                totalLogs: attack.totaleLogs,
                averageScore: attack.averageScore,
                text: aiSummary,
                materializedAt: new Date(),
                sourceRef: sourceRef || {
                    endpoint: RAG_POLICIES.ATTACKS.apiRef.endpoint,
                    method: RAG_POLICIES.ATTACKS.apiRef.method,
                    params: { 
                        type: 'attack',
                        ip: ip,
                        minLogsForAttack: RAG_POLICIES.ATTACKS.minLogs,
                        timeWindow: RAG_POLICIES.ATTACKS.timeWindow
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
        if (!this.initializationAttempted) return false;
        return this.isOperational;
    }

    private handleOperationError(operation: string, error: any) {
        this.logger.error(`[RagSync] Error during ${operation}: ${error.message}`);
        // Se riceviamo troppi errori consecutivi, potremmo disattivare il sistema temporaneamente
        // Per ora facciamo solo il log silenziato.
    }

    public getStatus() {
        return {
            operational: this.isOperational,
            initializationAttempted: this.initializationAttempted
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
