import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../di/tokens';
import ThreatLog from '../models/ThreatLogSchema';

import * as Tokens from '../di/tokens';

/**
 * PruningService
 * 
 * Gestisce la pulizia periodica del database:
 * 1. Eliminazione fisica dei log marcati come 'deleted' dopo X giorni.
 * 2. Archiviazione automatica di log 'active' molto vecchi (es. > 90 giorni).
 */
@injectable()
export class PruningService {
    private pruningInterval: NodeJS.Timeout | null = null;
    private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 ore
    private readonly DELETE_RETENTION_DAYS = 30; // Elimina definitivamente dopo 30gg nel cestino
    private readonly AUTO_ARCHIVE_DAYS = 90;    // Archivia automaticamente dopo 90gg

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) { }

    public start(): void {
        const isEnabled = process.env.PRUNING_ENABLED === 'true';
        
        if (!isEnabled) {
            this.logger.info('[PruningService] Background cleanup job is disabled (PRUNING_ENABLED=false).');
            return;
        }

        this.logger.info('[PruningService] Starting background cleanup job...');
        
        // Esegui subito un primo giro dopo 1 minuto dall'avvio
        setTimeout(() => this.prune(), 60000);

        this.pruningInterval = setInterval(() => this.prune(), this.CLEANUP_INTERVAL_MS);
    }

    public stop(): void {
        if (this.pruningInterval) {
            clearInterval(this.pruningInterval);
            this.pruningInterval = null;
        }
    }

    /**
     * Esegue le operazioni di pruning
     */
    public async prune(): Promise<void> {
        this.logger.info('[PruningService] Running database pruning cycle...');

        try {
            // 1. Eliminazione definitiva dei log 'deleted' più vecchi di retention
            const deleteThreshold = new Date();
            deleteThreshold.setDate(deleteThreshold.getDate() - this.DELETE_RETENTION_DAYS);

            const deleteResult = await ThreatLog.deleteMany({
                status: 'deleted',
                statusChangedAt: { $lt: deleteThreshold }
            });

            if (deleteResult.deletedCount > 0) {
                this.logger.info(`[PruningService] Permanently deleted ${deleteResult.deletedCount} logs from trash.`);
            }

            // 2. Archiviazione automatica di log 'active' molto vecchi
            const archiveThreshold = new Date();
            archiveThreshold.setDate(archiveThreshold.getDate() - this.AUTO_ARCHIVE_DAYS);

            const archiveResult = await ThreatLog.updateMany(
                {
                    status: 'active',
                    timestamp: { $lt: archiveThreshold }
                },
                {
                    $set: {
                        status: 'archived',
                        statusChangedAt: new Date(),
                        'statusContext.reason': 'auto_pruning_archive',
                        'statusContext.updatedBy': 'system'
                    }
                }
            );

            if (archiveResult.modifiedCount > 0) {
                this.logger.info(`[PruningService] Auto-archived ${archiveResult.modifiedCount} old active logs.`);
            }

        } catch (err) {
            this.logger.error('[PruningService] Error during pruning cycle:', err);
        }
    }
}
