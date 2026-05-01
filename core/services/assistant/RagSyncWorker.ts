import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN, RAG_SYNC_SERVICE_TOKEN } from '../../di/tokens';
import { RagSyncService } from './RagSyncService';
import { CampaignService } from '../CampaignService';
import { ThreatLogService } from '../ThreatLogService';
import { ILongRunningService, ServiceStatus } from '../../types/lifecycle';

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
        private readonly threatLogService: ThreatLogService
    ) { }

    public async start(): Promise<void> {
        this.status = ServiceStatus.STARTING;
        this.logger.info(`[${this.serviceName}] Starting RAG Synchronization Worker...`);

        try {
            // Inizializza Qdrant e verifica Ollama
            await this.ragSync.initialize();

            this.status = ServiceStatus.RUNNING;
            this.logger.info(`[${this.serviceName}] RAG Worker is now running.`);

            // Avvio loop periodico per la materializzazione (ogni 30 minuti)
            this.startMaterializer(30 * 60 * 1000);

            // Esecuzione immediata al primo avvio (Asincrona)
            this.runMaterialization();

        } catch (error) {
            this.status = ServiceStatus.FAILED;
            this.logger.error(`[${this.serviceName}] Failed to start: ${error}`);
            throw error;
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
            this.logger.info(`[${this.serviceName}] Running scheduled materialization...`);

            await this.campaignService.materializeCampaignSummaries().catch(err =>
                this.logger.error(`Campaign materialization failed: ${err}`)
            );
            await this.threatLogService.materializeAttackSummaries().catch(err =>
                this.logger.error(`Attack materialization failed: ${err}`)
            );
        } finally {
            this.isMaterializing = false;  // ← reset garantito anche in caso di errore
        }
    }
}
