import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { inject, singleton } from "tsyringe";
import { Logger } from "winston";
import * as Tokens from "../../di/tokens";
import { allowedOrigins } from "../../config";
import { SocketEvents } from "../../types/SocketEvents";

/**
 * SocketServerHub - Gestore dell'infrastruttura Socket.io.
 * Si occupa dell'inizializzazione, della gestione delle connessioni
 * e fornisce un'interfaccia scalabile per l'invio di messaggi.
 */
@singleton()
export class SocketServerHub {
    private io: SocketIOServer | null = null;
    private initialized = false;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {}

    /**
     * Inizializza il server Socket.io agganciandolo all'HTTP server esistente.
     */
    public initialize(httpServer: HttpServer): void {
        if (this.initialized) {
            this.logger.warn("[SocketServerHub] Tentativo di inizializzazione multipla ignorato.");
            return;
        }

        this.logger.info("[SocketServerHub] Inizializzazione Socket.io in corso...");

        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.setupHandlers();
        this.initialized = true;
        this.logger.info("[SocketServerHub] Socket.io inizializzato con successo.");
    }

    /**
     * Configura i gestori di base per le connessioni.
     */
    private setupHandlers(): void {
        if (!this.io) return;

        this.io.on("connection", (socket) => {
            const clientCount = this.io?.engine.clientsCount;
            this.logger.info(`[SocketServerHub] Client connesso: ${socket.id}. Totale client: ${clientCount}`);

            socket.on("disconnect", (reason) => {
                const remainingClients = this.io?.engine.clientsCount;
                this.logger.info(`[SocketServerHub] Client disconnesso: ${socket.id} (Ragione: ${reason}). Rimasti: ${remainingClients}`);
            });

            // Endpoint di ping per debug
            socket.on(SocketEvents.PING_CHECK, () => {
                socket.emit(SocketEvents.PONG_CHECK, { timestamp: new Date().toISOString() });
            });
        });
    }

    /**
     * Invia un messaggio a tutti i client connessi o a una specifica stanza/namespace.
     * Metodo generico e scalabile per futuri sviluppi.
     */
    public emit(event: string, data: any, room?: string): void {
        if (!this.io) {
            this.logger.error(`[SocketServerHub] Impossibile emettere evento ${event}: server non inizializzato.`);
            return;
        }

        if (room) {
            this.io.to(room).emit(event, data);
        } else {
            this.io.emit(event, data);
        }
    }

    /**
     * Restituisce l'istanza raw di Socket.io per casi d'uso avanzati.
     */
    public getIO(): SocketIOServer | null {
        return this.io;
    }

    /**
     * Shutdown controllato per il graceful shutdown del server.
     */
    public async shutdown(): Promise<void> {
        if (this.io) {
            this.logger.info("[SocketServerHub] Chiusura Socket.io...");
            return new Promise((resolve) => {
                this.io?.close(() => {
                    this.logger.info("[SocketServerHub] Socket.io chiuso.");
                    resolve();
                });
            });
        }
    }
}
