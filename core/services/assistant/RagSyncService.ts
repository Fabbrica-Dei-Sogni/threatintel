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

@injectable()
export class RagSyncService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(RAG_TRANSLATION_TOKEN) private readonly translator: RagTranslationService,
        @inject(QDRANT_CLIENT_TOKEN) private readonly qdrant: QdrantClientService,
        @inject(OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService
    ) {}

    /**
     * Sincronizza un ThreatLog nel database vettoriale.
     */
    public async syncThreatLog(log: IThreatLog) {
        try {
            this.logger.debug(`[RagSync] Syncing ThreatLog ${log.id}`);
            
            // 1. Traduzione
            const narrative = this.translator.translateThreatLog(log);
            
            // 2. Embedding
            const vector = await this.ollama.getEmbedding(narrative);
            
            // 3. Upsert su Qdrant
            await this.qdrant.upsertPoints([{
                id: log._id.toString(),
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
            this.logger.error(`[RagSync] Error syncing ThreatLog: ${error}`);
        }
    }

    /**
     * Sincronizza IpDetails nel database vettoriale.
     */
    public async syncIpDetails(ipDetails: IIpDetails, abuseData?: IAbuseIpDb | null, abuseReports?: IAbuseReport[]) {
        try {
            this.logger.debug(`[RagSync] Syncing IpDetails for ${ipDetails.ip}`);
            
            // 1. Traduzione
            const narrative = this.translator.translateIpDetails(ipDetails, abuseData, abuseReports);
            
            // 2. Embedding
            const vector = await this.ollama.getEmbedding(narrative);
            
            // 3. Upsert su Qdrant
            await this.qdrant.upsertPoints([{
                id: ipDetails._id.toString(),
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
            this.logger.error(`[RagSync] Error syncing IpDetails: ${error}`);
        }
    }

    /**
     * Sincronizza un riassunto di campagna nel database vettoriale.
     */
    public async syncCampaignSummary(campaign: any, aiSummary: string, vector: number[]) {
        try {
            this.logger.debug(`[RagSync] Syncing Campaign Summary for ${campaign.hash}`);
            
            await this.qdrant.upsertPoints([{
                id: `campaign-${campaign.hash}`,
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
            this.logger.error(`[RagSync] Error syncing Campaign Summary: ${error}`);
        }
    }

    /**
     * Sincronizza un riassunto di attacco (IP-centrico) nel database vettoriale.
     */
    public async syncAttackSummary(attack: any, aiSummary: string, vector: number[]) {
        try {
            this.logger.debug(`[RagSync] Syncing Attack Summary for IP ${attack.ip}`);
            
            await this.qdrant.upsertPoints([{
                id: `attack-${attack.ip.replace(/\./g, '-')}`,
                vector: vector,
                payload: {
                    type: 'attack_summary',
                    ip: attack.ip,
                    totalLogs: attack.totaleLogs,
                    averageScore: attack.averageScore,
                    text: aiSummary,
                    materializedAt: new Date()
                }
            }]);
        } catch (error) {
            this.logger.error(`[RagSync] Error syncing Attack Summary: ${error}`);
        }
    }

    /**
     * Inizializza il sistema RAG.
     */
    public async initialize() {
        this.logger.info('[RagSync] Initializing RAG Synchronization system...');
        try {
            await this.qdrant.initializeCollection(768);
            const ollamaOk = await this.ollama.checkHealth();
            if (!ollamaOk) {
                this.logger.warn('[RagSync] Ollama service is not reachable.');
            }
        } catch (error) {
            this.logger.error(`[RagSync] Initialization failed: ${error}`);
        }
    }
}
