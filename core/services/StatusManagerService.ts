import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { EventBus, AppEvents } from './EventBus';

export interface StatusUpdatePayload {
    filter: Record<string, any>;
    status: 'active' | 'archived' | 'deleted';
    context: {
        reason: string;
        sourceId?: string;
        updatedBy?: string;
    };
}

import * as Tokens from '../di/tokens';

/**
 * StatusManagerService
 * 
 * Servizio per la gestione centralizzata del ciclo di vita dei log.
 * Coordina il cambio di stato (active, archived, deleted) in modo asincrono.
 */
@injectable()
export class StatusManagerService {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.EVENT_BUS_TOKEN) private readonly eventBus: EventBus
    ) { }

    /**
     * Richiede l'archiviazione di tutti i log di una campagna.
     */
    public async archiveCampaign(hash: string, updatedBy?: string): Promise<void> {
        this.logger.info(`[StatusManagerService] Requesting archive for campaign: ${hash}`);
        
        const payload: StatusUpdatePayload = {
            filter: { 'fingerprint.hash': hash },
            status: 'archived',
            context: {
                reason: 'campaign_archived',
                sourceId: hash,
                updatedBy
            }
        };

        this.eventBus.emit(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, payload);
    }

    /**
     * Richiede l'archiviazione di tutti i log di un attacco (IP).
     */
    public async archiveAttack(ip: string, updatedBy?: string): Promise<void> {
        this.logger.info(`[StatusManagerService] Requesting archive for attack IP: ${ip}`);
        
        const payload: StatusUpdatePayload = {
            filter: { 'request.ip': ip },
            status: 'archived',
            context: {
                reason: 'attack_archived',
                sourceId: ip,
                updatedBy
            }
        };

        this.eventBus.emit(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, payload);
    }

    /**
     * Richiede il cambio di stato per un singolo log tramite ID.
     */
    public async updateLogStatus(
        logId: string, 
        status: 'active' | 'archived' | 'deleted', 
        reason: string, 
        updatedBy?: string
    ): Promise<void> {
        this.logger.info(`[StatusManagerService] Requesting ${status} for log: ${logId}`);
        
        const payload: StatusUpdatePayload = {
            filter: { id: logId },
            status,
            context: {
                reason,
                sourceId: logId,
                updatedBy
            }
        };

        this.eventBus.emit(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, payload);
    }
    
    /**
     * Gestisce la logica di smistamento per il cambio di stato.
     */
    public async processStatusChange(
        type: 'log' | 'attack' | 'campaign',
        id: string,
        status: 'active' | 'archived' | 'deleted',
        reason: string,
        updatedBy: string
    ): Promise<void> {
        switch (type) {
            case 'log':
                await this.updateLogStatus(id, status, reason, updatedBy);
                break;
            case 'attack':
                if (status === 'archived') {
                    await this.archiveAttack(id, updatedBy);
                } else {
                    await this.updateLogStatus(id, status, reason, updatedBy);
                }
                break;
            case 'campaign':
                if (status === 'archived') {
                    await this.archiveCampaign(id, updatedBy);
                } else {
                    await this.updateLogStatus(id, status, reason, updatedBy);
                }
                break;
            default:
                throw new Error(`Tipo entità non supportato: ${type}`);
        }
    }

    /**
     * Richiede il ripristino (active) di log precedentemente archiviati/cancellati per un certo contesto.
     */
    public async restoreByContext(sourceId: string, updatedBy?: string): Promise<void> {
        this.logger.info(`[StatusManagerService] Requesting restore for context: ${sourceId}`);
        
        const payload: StatusUpdatePayload = {
            filter: { 'statusContext.sourceId': sourceId },
            status: 'active',
            context: {
                reason: 'manual_restore',
                sourceId,
                updatedBy
            }
        };

        this.eventBus.emit(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, payload);
    }
}
