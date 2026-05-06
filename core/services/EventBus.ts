/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import { EventEmitter } from 'events';
import { singleton, inject } from 'tsyringe';
import { Logger } from 'winston';
import * as Tokens from '../di/tokens';

/**
 * Nomi degli eventi supportati dal sistema.
 */
export enum AppEvents {
    THREAT_LOG_CREATED = 'threat_log.created',
    IP_DETAILS_UPDATED = 'ip_details.updated',
    ATTACK_SEARCHED = 'attack.searched',
    CAMPAIGN_SEARCHED = 'campaign.searched',
    ATTACK_RESOLVED = 'attack.resolved',
    CAMPAIGN_RESOLVED = 'campaign.resolved',
    LOGS_STATUS_UPDATE_REQUESTED = 'logs.status.update.requested',
    LOGS_STATUS_UPDATED = 'logs.status.updated'
}

/**
 * Un Event Bus leggero basato su EventEmitter di Node.js.
 * Permette il disaccoppiamento tra la logica di business e i servizi trasversali (es. RAG).
 */
@singleton()
export class EventBus {
    private emitter: EventEmitter;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {
        this.emitter = new EventEmitter();
        // Aumentiamo il limite se necessario, ma per ora il default (10) va bene
        this.emitter.setMaxListeners(20);
    }

    /**
     * Emette un evento nel sistema.
     */
    public emit(event: AppEvents, data: any) {
        this.logger.debug(`[EventBus] Emitting event: ${event}`);
        this.emitter.emit(event, data);
    }

    /**
     * Registra un ascoltatore per un evento.
     */
    public on(event: AppEvents, listener: (data: any) => void) {
        this.logger.debug(`[EventBus] Registering listener for: ${event}`);
        this.emitter.on(event, listener);
    }

    /**
     * Rimuove un ascoltatore.
     */
    public off(event: AppEvents, listener: (data: any) => void) {
        this.emitter.off(event, listener);
    }
}
