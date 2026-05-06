/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { EventBus, AppEvents } from './EventBus';
import ThreatLog from '../models/ThreatLogSchema';
import { StatusUpdatePayload } from './StatusManagerService';

import * as Tokens from '../di/tokens';

/**
 * StatusEventListener
 * 
 * Reagisce alle richieste di cambio stato log ed esegue l'operazione fisica su MongoDB.
 * Gestisce il "lavoro sporco" in background per non bloccare le API.
 */
@injectable()
export class StatusEventListener {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.EVENT_BUS_TOKEN) private readonly eventBus: EventBus
    ) { }

    /**
     * Avvia l'ascolto degli eventi.
     */
    public start(): void {
        this.eventBus.on(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, this.handleStatusUpdateRequest.bind(this));
        this.logger.info('[StatusEventListener] Listener per cambio stato avviato');
    }

    /**
     * Esegue l'aggiornamento massivo su MongoDB.
     */
    private async handleStatusUpdateRequest(payload: StatusUpdatePayload): Promise<void> {
        const { filter, status, context } = payload;
        
        this.logger.info(`[StatusEventListener] Processing status update to "${status}" for filter: ${JSON.stringify(filter)}`);

        try {
            const result = await ThreatLog.updateMany(
                filter,
                {
                    $set: {
                        status: status,
                        statusChangedAt: new Date(),
                        'statusContext.reason': context.reason,
                        'statusContext.sourceId': context.sourceId,
                        'statusContext.updatedBy': context.updatedBy
                    }
                }
            );

            this.logger.info(`[StatusEventListener] Update completed: ${result.modifiedCount} logs affected`);

            // Notifica il sistema del completamento (es. per sincronizzazione RAG)
            this.eventBus.emit(AppEvents.LOGS_STATUS_UPDATED, {
                ...payload,
                modifiedCount: result.modifiedCount
            });

        } catch (error: any) {
            this.logger.error(`[StatusEventListener] Failed to update logs status: ${error.message}`);
        }
    }
}
