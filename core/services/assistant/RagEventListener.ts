import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN, RAG_SYNC_SERVICE_TOKEN, EVENT_BUS_TOKEN } from '../../di/tokens';
import { RagSyncService } from './RagSyncService';
import { EventBus, AppEvents } from '../EventBus';
import { ILongRunningService, ServiceStatus } from '../../types/lifecycle';

/**
 * Il "ponte" tra gli eventi applicativi e il sistema di sincronizzazione RAG.
 * Ascolta i cambiamenti nel sistema e triggera le operazioni di materializzazione/vettorializzazione.
 */
@injectable()
export class RagEventListener implements ILongRunningService {
    public readonly serviceName = 'RagEventListener';
    private status: ServiceStatus = ServiceStatus.IDLE;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService,
        @inject(EVENT_BUS_TOKEN) private readonly eventBus: EventBus
    ) {}

    public async start(): Promise<void> {
        this.status = ServiceStatus.STARTING;
        this.logger.info(`[${this.serviceName}] Starting RAG Event Listener...`);

        try {
            // Sincronizzazione Log Atomico
            this.eventBus.on(AppEvents.THREAT_LOG_CREATED, async (log) => {
                this.logger.info(`[${this.serviceName}] Event received: ${AppEvents.THREAT_LOG_CREATED} for IP: ${log.request?.ip}`);
                await this.ragSync.syncThreatLog(log);
            });

            // Sincronizzazione Dettagli IP (Arricchimento)
            this.eventBus.on(AppEvents.IP_DETAILS_UPDATED, async (data) => {
                this.logger.info(`[${this.serviceName}] Event received: ${AppEvents.IP_DETAILS_UPDATED} for IP: ${data.ipDetails?.ip}`);
                const { ipDetails, abuseData, reports } = data;
                await this.ragSync.syncIpDetails(ipDetails, abuseData, reports);
            });

            // Materializzazione Attacco (Anomalia) - Triggerata da ricerca o resolve
            this.eventBus.on(AppEvents.ATTACK_RESOLVED, async (attack) => {
                this.logger.info(`[${this.serviceName}] Event received: ${AppEvents.ATTACK_RESOLVED} for IP: ${attack.ip}`);
                await this.ragSync.materializeAttack(attack);
            });

            this.eventBus.on(AppEvents.ATTACK_SEARCHED, async (result) => {
                const attacks = result.items || [];
                if (attacks.length > 0) {
                    this.logger.info(`[${this.serviceName}] Event received: ${AppEvents.ATTACK_SEARCHED} (${attacks.length} items)`);
                    for (const attack of attacks) {
                        await this.ragSync.materializeAttack(attack);
                    }
                }
            });

            // Materializzazione Campagna - Triggerata da ricerca o resolve
            this.eventBus.on(AppEvents.CAMPAIGN_RESOLVED, async (campaign) => {
                this.logger.info(`[${this.serviceName}] Event received: ${AppEvents.CAMPAIGN_RESOLVED} for hash: ${campaign.hash}`);
                await this.ragSync.materializeCampaign(campaign);
            });

            this.eventBus.on(AppEvents.CAMPAIGN_SEARCHED, async (campaigns: any[]) => {
                if (campaigns.length > 0) {
                    this.logger.info(`[${this.serviceName}] Event received: ${AppEvents.CAMPAIGN_SEARCHED} (${campaigns.length} items)`);
                    for (const campaign of campaigns) {
                        await this.ragSync.materializeCampaign(campaign);
                    }
                }
            });

            this.status = ServiceStatus.RUNNING;
            this.logger.info(`[${this.serviceName}] RAG Event Listener is now running and subscribed to AppEvents.`);
        } catch (error) {
            this.status = ServiceStatus.FAILED;
            this.logger.error(`[${this.serviceName}] Failed to start: ${error}`);
        }
    }

    public stop(): void {
        this.status = ServiceStatus.IDLE;
        // EventEmitter non richiede uno stop esplicito per gli ascoltatori se l'oggetto muore,
        // ma se volessimo essere granulari potremmo fare l'off di ogni evento.
        this.logger.info(`[${this.serviceName}] RAG Event Listener stopped.`);
    }

    public getStatus(): ServiceStatus {
        return this.status;
    }
}
