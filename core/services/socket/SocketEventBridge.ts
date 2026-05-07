import { inject, singleton } from "tsyringe";
import { Logger } from "winston";
import { EventBus, AppEvents } from "../EventBus";
import { SocketServerHub } from "./SocketServerHub";
import * as Tokens from "../../di/tokens";
import { SocketEvents } from "../../types/SocketEvents";

/**
 * SocketEventBridge - Bridge tra l'EventBus interno e Socket.io.
 * Mappa gli eventi applicativi verso i client connessi in tempo reale.
 * Questo layer permette di separare la logica di business dal protocollo di trasporto.
 */
@singleton()
export class SocketEventBridge {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.EVENT_BUS_TOKEN) private readonly eventBus: EventBus,
        @inject(Tokens.SOCKET_SERVER_HUB_TOKEN) private readonly socketHub: SocketServerHub
    ) { }

    /**
     * Avvia l'ascolto degli eventi applicativi.
     */
    public initialize(): void {
        this.logger.info("[SocketEventBridge] Inizializzazione bridge eventi...");

        // --- Eventi di Intelligence ---

        this.eventBus.on(AppEvents.THREAT_LOG_CREATED, (log) => {
            this.socketHub.emit(SocketEvents.INTEL_NEW_LOG, log);
        });

        this.eventBus.on(AppEvents.ATTACK_RESOLVED, (attack) => {
            this.socketHub.emit(SocketEvents.INTEL_ATTACK_DETECTED, attack);
        });

        this.eventBus.on(AppEvents.CAMPAIGN_RESOLVED, (campaign) => {
            this.socketHub.emit(SocketEvents.INTEL_CAMPAIGN_UPDATE, campaign);
        });

        // --- Eventi di Sistema e Job ---

        this.eventBus.on(AppEvents.SYSTEM_STATUS_UPDATED, (status) => {
            this.socketHub.emit(SocketEvents.SYSTEM_STATUS_UPDATE, status);
        });
        // 5. Inoltro progresso job
        this.eventBus.on(AppEvents.JOB_PROGRESS, (data) => {
            this.socketHub.emit(SocketEvents.SYSTEM_JOB_PROGRESS, data);
        });

        // 6. Inoltro risposte AI in tempo reale
        this.eventBus.on(AppEvents.AI_RESPONSE_GENERATED, (data) => {
            this.socketHub.emit(SocketEvents.INTEL_AI_RESPONSE, data);
        });

        this.logger.info("[SocketEventBridge] Bridge eventi inizializzato.");
    }
}
