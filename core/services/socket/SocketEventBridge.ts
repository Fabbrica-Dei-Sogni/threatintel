import { inject, singleton } from "tsyringe";
import { Logger } from "winston";
import { EventBus, AppEvents } from "../EventBus";
import { SocketServerHub } from "./SocketServerHub";
import * as Tokens from "../../di/tokens";

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
    ) {}

    /**
     * Avvia l'ascolto degli eventi applicativi.
     */
    public initialize(): void {
        this.logger.info("[SocketEventBridge] Inizializzazione bridge eventi...");

        // --- Eventi di Intelligence ---
        
        this.eventBus.on(AppEvents.THREAT_LOG_CREATED, (log) => {
            this.socketHub.emit("intel:new_log", log);
        });

        this.eventBus.on(AppEvents.ATTACK_RESOLVED, (attack) => {
            this.socketHub.emit("intel:attack_detected", attack);
        });

        this.eventBus.on(AppEvents.CAMPAIGN_RESOLVED, (campaign) => {
            this.socketHub.emit("intel:campaign_update", campaign);
        });

        // --- Eventi di Sistema e Job ---

        this.eventBus.on(AppEvents.SYSTEM_STATUS_UPDATED, (status) => {
            this.socketHub.emit("system:status_update", status);
        });

        this.eventBus.on(AppEvents.JOB_PROGRESS, (data) => {
            this.socketHub.emit("system:job_progress", data);
        });
        
        this.logger.info("[SocketEventBridge] Bridge eventi inizializzato.");
    }
}
