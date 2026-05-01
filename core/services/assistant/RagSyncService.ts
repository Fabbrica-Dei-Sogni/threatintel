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

@injectable()
export class RagSyncService {
    private isOperational: boolean = false;
    private initializationAttempted: boolean = false;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(RAG_TRANSLATION_TOKEN) private readonly translator: RagTranslationService,
        @inject(QDRANT_CLIENT_TOKEN) private readonly qdrant: QdrantClientService,
        @inject(OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService
    ) { }

    /**
     * Sincronizza un ThreatLog nel database vettoriale.
     */
    public async syncThreatLog(log: IThreatLog) {
        if (!this.checkOperational()) return;

        try {
            this.logger.debug(`[RagSync] Syncing ThreatLog ${log.id}`);

            // 1. Traduzione
            const narrative = this.translator.translateThreatLog(log);

            // 2. Embedding
            const vector = await this.ollama.getEmbedding(narrative);

            // 3. Upsert su Qdrant
            await this.qdrant.upsertPoints([{
                id: stringToUuid(log._id.toString()),
                vector: vector,
                payload: {
                    type: 'threat_log',
                    mongoId: log._id.toString(),
                    ip: log.request?.ip,
                    timestamp: log.timestamp,
                    score: log.fingerprint?.score,
                    text: narrative
                }
            }]);
        } catch (error) {
            this.handleOperationError('syncThreatLog', error);
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
            await this.qdrant.upsertPoints([{
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
    public async syncCampaignSummary(campaign: any, aiSummary: string, vector: number[]) {
        if (!this.checkOperational()) return;

        try {
            this.logger.debug(`[RagSync] Syncing Campaign Summary for ${campaign.hash}`);

            await this.qdrant.upsertPoints([{
                id: stringToUuid(`campaign-${campaign.hash}`),
                vector: vector,
                payload: {
                    type: 'campaign_summary',
                    campaignId: campaign.hash,
                    ipCount: campaign.ipCount,
                    topIps: campaign.topIps,
                    protocols: campaign.protocols,
                    text: aiSummary,
                    materializedAt: new Date()
                }
            }]);
        } catch (error) {
            this.handleOperationError('syncCampaignSummary', error);
        }
    }

    /**
     * Sincronizza un riassunto di attacco (IP-centrico) nel database vettoriale.
     */
    public async syncAttackSummary(attack: any, aiSummary: string, vector: number[]) {
        if (!this.checkOperational()) return;

        try {
            const ip = attack.request?.ip || attack.ip;
            this.logger.debug(`[RagSync] Syncing Attack Summary for IP ${ip}`);

            await this.qdrant.upsertPoints([{
                id: stringToUuid(`attack-${ip}`),
                vector: vector,
                payload: {
                    type: 'attack_summary',
                    ip: ip,
                    totalLogs: attack.totaleLogs,
                    averageScore: attack.averageScore,
                    text: aiSummary,
                    materializedAt: new Date()
                }
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
            // Verifica connettività Qdrant
            await this.qdrant.initializeCollection(768);

            // Verifica connettività Ollama
            const ollamaOk = await this.ollama.checkHealth();
            if (!ollamaOk) {
                throw new Error('Ollama service is unreachable');
            }

            this.isOperational = true;
            this.logger.info('[RagSync] RAG system is fully operational.');
        } catch (error) {
            this.isOperational = false;
            this.logger.warn(`[RagSync] RAG system initialized in DEGRADED mode (Disabled): ${error.message}`);
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
}
