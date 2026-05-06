import { inject, singleton, delay } from 'tsyringe';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { ILongRunningService, ServiceStatus } from '../types/lifecycle';

@singleton()
export class LifecycleManager {
    private services: ILongRunningService[] = [];
    private startupTimeout = 60000; // 60 secondi default timeout per tutto il bootstrap

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {}

    /**
     * Registra i servizi da gestire.
     * Nota: usiamo l'iniezione post-costruzione o manuale per evitare dipendenze circolari
     * se i servizi avessero bisogno del LifecycleManager (anche se non dovrebbe).
     */
    public register(service: ILongRunningService) {
        this.services.push(service);
        this.logger.debug(`[LifecycleManager] Servizio registrato: ${service.serviceName}`);
    }

    /**
     * Avvia tutti i servizi registrati in parallelo con gestione dei timeout.
     */
    public async boot() {
        this.logger.info(`[LifecycleManager] Avvio sequenza di bootstrap per ${this.services.length} servizi...`);

        const startPromises = this.services.map(async (service) => {
            try {
                this.logger.info(`[LifecycleManager] Avvio servizio: ${service.serviceName}...`);
                
                // Crea una promessa con timeout per l'avvio del singolo servizio
                await this.withTimeout(
                    service.start(),
                    30000, // 30 secondi per singolo servizio
                    `Timeout durante l'avvio di ${service.serviceName}`
                );

                this.logger.info(`[LifecycleManager] ✅ Servizio ${service.serviceName} avviato correttamente.`);
            } catch (error: any) {
                this.logger.error(`[LifecycleManager] ❌ Fallimento avvio ${service.serviceName}: ${error.message}`);
                // Non interrompiamo il bootstrap degli altri servizi se uno fallisce
            }
        });

        await Promise.all(startPromises);
        this.logger.info('[LifecycleManager] Sequenza di bootstrap completata.');
        this.reportStatus();
    }

    private reportStatus() {
        this.logger.info('--- Stato Servizi Background ---');
        this.services.forEach(s => {
            const status = s.getStatus();
            const icon = status === ServiceStatus.RUNNING ? '✅' : '❌';
            this.logger.info(`${icon} ${s.serviceName}: ${status}`);
        });
        this.logger.info('-------------------------------');
    }

    private async withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
        });

        return Promise.race([
            promise,
            timeoutPromise
        ]).finally(() => clearTimeout(timeoutId));
    }

    public async shutdown() {
        this.logger.info(`[LifecycleManager] Spegnimento di ${this.services.length} servizi in corso...`);
        
        const stopPromises = this.services.map(async (s) => {
            try {
                this.logger.info(`[LifecycleManager] Fermando servizio: ${s.serviceName}...`);
                await s.stop();
                this.logger.info(`[LifecycleManager] ✅ Servizio ${s.serviceName} fermato.`);
            } catch (err: any) {
                this.logger.error(`[LifecycleManager] ❌ Errore fermando ${s.serviceName}: ${err.message}`);
            }
        });

        await Promise.all(stopPromises);
        this.logger.info('[LifecycleManager] Spegnimento completato.');
    }
}
