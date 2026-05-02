import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN, RAG_SYNC_SERVICE_TOKEN } from '../../di/tokens';
import { RagSyncService } from './RagSyncService';
import { CampaignService } from '../CampaignService';
import { ThreatLogService } from '../ThreatLogService';
import { ConfigService } from '../ConfigService';
import { ILongRunningService, ServiceStatus } from '../../types/lifecycle';
import { RAG_POLICIES } from './RagPolicies';

@injectable()
export class RagSyncWorker implements ILongRunningService {
    public readonly serviceName = 'RagSyncWorker';
    private status: ServiceStatus = ServiceStatus.IDLE;
    private timer: NodeJS.Timeout | null = null;
    private isMaterializing: boolean = false;  // ← flag

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService,
        private readonly campaignService: CampaignService,
        private readonly threatLogService: ThreatLogService,
        private readonly configService: ConfigService
    ) { }

    public async start(): Promise<void> {
        this.status = ServiceStatus.STARTING;
        this.logger.info(`[${this.serviceName}] Starting RAG Synchronization Worker...`);

        try {
            // Inizializza Qdrant e verifica Ollama
            await this.ragSync.initialize();

            this.status = ServiceStatus.RUNNING;
            
            // Se disabilitato, non avviamo nemmeno il materializzatore
            const ragStatus = this.ragSync.getStatus();
            if (!ragStatus.operational && !ragStatus.enabled) {
                this.logger.info(`[${this.serviceName}] RAG Worker idle (disabled).`);
                return;
            }

            this.logger.info(`[${this.serviceName}] RAG Worker is now running.`);

            // Avvio loop periodico per la materializzazione (ogni 30 minuti)
            this.startMaterializer(30 * 60 * 1000);

            // Esecuzione immediata al primo avvio (Asincrona)
            this.runMaterialization();

        } catch (error) {
            this.status = ServiceStatus.FAILED;
            this.logger.error(`[${this.serviceName}] Failed to start: ${error}`);
            // Non rilanciamo l'errore per non bloccare il bootstrap globale (ma lo logghiamo come errore)
        }
    }

    public stop(): void {
        this.status = ServiceStatus.IDLE;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.logger.info(`[${this.serviceName}] RAG Worker stopped.`);
    }

    public getStatus(): ServiceStatus {
        return this.status;
    }

    private startMaterializer(intervalMs: number) {
        this.logger.info(`[${this.serviceName}] Materializer scheduled every ${intervalMs / 60000} minutes.`);
        this.timer = setInterval(async () => {
            await this.runMaterialization();
        }, intervalMs);
    }

    private async runMaterialization() {
        if (this.isMaterializing) {
            this.logger.warn(`[${this.serviceName}] Materialization already running, skipping this cycle.`);
            return;  // ← early return: il ciclo viene saltato, non accodato
        }

        this.isMaterializing = true;
        try {
            // Verifica se il sistema RAG è operativo, altrimenti tenta il recupero (Auto-Recovery)
            const status = this.ragSync.getStatus();
            if (!status.operational) {
                this.logger.info(`[${this.serviceName}] RAG system is not operational. Attempting auto-recovery/initialization...`);
                await this.ragSync.initialize();
                
                // Se ancora non è operativo, saltiamo questo ciclo per evitare errori a catena
                if (!this.ragSync.getStatus().operational) {
                    this.logger.warn(`[${this.serviceName}] Auto-recovery failed. Skipping materialization cycle.`);
                    return;
                }
            }

            this.logger.info(`[${this.serviceName}] Running scheduled materialization...`);

            const aiEnabledConfig = await this.configService.getConfigValue('RAG_AI_SUMMARY_ENABLED');
            const isAiEnabled = aiEnabledConfig === 'true' || process.env.RAG_AI_SUMMARY_ENABLED === 'true';

            // 1. Materializzazione Campagne
            await this.runCampaignMaterialization(isAiEnabled);

            // 2. Materializzazione Attacchi (Anomalie IP)
            await this.runAttackMaterialization(isAiEnabled);
        } finally {
            this.isMaterializing = false;  // ← reset garantito anche in caso di errore
        }
    }

    /**
     * Loop di materializzazione per le campagne.
     */
    private async runCampaignMaterialization(isAiEnabled: boolean) {
        this.logger.info(`[${this.serviceName}] Starting campaign materialization...`);
        let currentPage = 1;
        const policy = RAG_POLICIES.CAMPAIGNS;
        let totalProcessed = 0;
        let hasMore = true;

        while (hasMore) {
            try {
                const result = await this.campaignService.getCampaigns({ 
                    minIps: policy.minIps, 
                    pageSize: policy.pageSize, 
                    page: currentPage,
                    timeConfig: policy.timeConfig
                });

                if (!result.campaigns || result.campaigns.length === 0) break;

                for (const campaign of result.campaigns) {
                    // campaign qui è il risultato dell'aggregazione di CampaignService
                    await this.ragSync.materializeCampaign(campaign, { isAiEnabled });
                    totalProcessed++;
                }

                if (result.campaigns.length < policy.pageSize || totalProcessed >= result.total) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            } catch (error) {
                this.logger.error(`[${this.serviceName}] Campaign materialization error at page ${currentPage}: ${error.message}`);
                hasMore = false;
            }
        }
        this.logger.info(`[${this.serviceName}] Campaign materialization finished. Total: ${totalProcessed}`);
    }

    /**
     * Loop di materializzazione per gli attacchi (Anomalie).
     */
    private async runAttackMaterialization(isAiEnabled: boolean) {
        this.logger.info(`[${this.serviceName}] Starting attack materialization...`);
        let currentPage = 1;
        const policy = RAG_POLICIES.ATTACKS;
        let totalProcessed = 0;
        let hasMore = true;

        while (hasMore) {
            try {
                const result = await this.threatLogService.getAttacks({ 
                    page: currentPage, 
                    pageSize: policy.pageSize, 
                    minLogsForAttack: policy.minLogs, 
                    timeConfig: policy.timeConfig
                });

                const attacks = result.items || [];
                if (attacks.length === 0) break;

                for (const attack of attacks) {
                    await this.ragSync.materializeAttack(attack, { isAiEnabled });
                    totalProcessed++;
                }

                if (attacks.length < policy.pageSize || totalProcessed >= result.totalCount) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            } catch (error) {
                this.logger.error(`[${this.serviceName}] Attack materialization error at page ${currentPage}: ${error.message}`);
                hasMore = false;
            }
        }
        this.logger.info(`[${this.serviceName}] Attack materialization finished. Total: ${totalProcessed}`);
    }
}
