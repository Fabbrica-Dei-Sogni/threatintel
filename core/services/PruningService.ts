/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import * as Tokens from '../di/tokens';
import ThreatLog from '../models/ThreatLogSchema';

export interface PruningParams {
    archiveDays?: number;      // Giorni dopo i quali un log 'active' diventa 'archived'
    retentionDays?: number;    // Giorni dopo i quali un log 'deleted' viene rimosso definitivamente
    deletionDays?: number;     // Giorni dopo i quali un log 'archived' viene rimosso definitivamente
    resetAllToActive?: boolean; // RESET DI EMERGENZA: porta tutto ad 'active'
    limit?: number;            // Limite di record da processare per blocco (opzionale)
}

@injectable()
export class PruningService {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) { }

    /**
     * Esegue le operazioni di pruning basandosi sui parametri forniti.
     * Restituisce le statistiche dell'operazione.
     */
    public async prune(params: PruningParams = {}): Promise<{ archived: number, deleted: number, reset?: number }> {
        const stats: { archived: number, deleted: number, reset: number } = { archived: 0, deleted: 0, reset: 0 };
        
        try {
            // 0. RESET DI EMERGENZA
            if (params.resetAllToActive) {
                this.logger.warn('[PruningService] EMERGENCY RESET: Setting all logs to ACTIVE status...');
                const resetResult = await ThreatLog.updateMany(
                    { status: { $ne: 'active' } },
                    { 
                        $set: { 
                            status: 'active',
                            statusChangedAt: new Date(),
                            'statusContext.reason': 'emergency_reset_to_active',
                            'statusContext.updatedBy': 'system'
                        } 
                    }
                );
                stats.reset = resetResult.modifiedCount;
                this.logger.info(`[PruningService] Emergency reset completed. ${stats.reset} logs updated to active.`);
                
                // Se abbiamo fatto un reset, terminiamo qui l'operazione per evitare conflitti immediati con le soglie temporali
                return stats;
            }

            // 1. Archiviazione automatica di log 'active' vecchi
            if (params.archiveDays && params.archiveDays > 0) {
                const archiveThreshold = new Date();
                archiveThreshold.setDate(archiveThreshold.getDate() - params.archiveDays);

                const archiveResult = await ThreatLog.updateMany(
                    {
                        status: 'active',
                        timestamp: { $lt: archiveThreshold }
                    },
                    {
                        $set: {
                            status: 'archived',
                            statusChangedAt: new Date(),
                            'statusContext.reason': 'manual_pruning_archive',
                            'statusContext.updatedBy': 'system'
                        }
                    }
                );
                stats.archived = archiveResult.modifiedCount;
                if (stats.archived > 0) {
                    this.logger.info(`[PruningService] Archived ${stats.archived} old active logs.`);
                }
            }

            // 2. Eliminazione definitiva dei log 'deleted' (Cestino)
            if (params.retentionDays && params.retentionDays > 0) {
                const deleteThreshold = new Date();
                deleteThreshold.setDate(deleteThreshold.getDate() - params.retentionDays);

                const deleteResult = await ThreatLog.deleteMany({
                    status: 'deleted',
                    statusChangedAt: { $lt: deleteThreshold }
                });

                stats.deleted += deleteResult.deletedCount;
                if (deleteResult.deletedCount > 0) {
                    this.logger.info(`[PruningService] Permanently deleted ${deleteResult.deletedCount} logs from trash.`);
                }
            }

            // 3. Eliminazione definitiva dei log 'archived' molto vecchi
            if (params.deletionDays && params.deletionDays > 0) {
                const archiveDeleteThreshold = new Date();
                archiveDeleteThreshold.setDate(archiveDeleteThreshold.getDate() - params.deletionDays);

                const archiveDeleteResult = await ThreatLog.deleteMany({
                    status: 'archived',
                    statusChangedAt: { $lt: archiveDeleteThreshold }
                });

                stats.deleted += archiveDeleteResult.deletedCount;
                if (archiveDeleteResult.deletedCount > 0) {
                    this.logger.info(`[PruningService] Permanently deleted ${archiveDeleteResult.deletedCount} archived logs.`);
                }
            }

            /* 
            // VECCHIA REGOLA AUTOMATICA (Commentata come richiesto)
            const defaultDeleteThreshold = new Date();
            defaultDeleteThreshold.setDate(defaultDeleteThreshold.getDate() - 30);
            await ThreatLog.deleteMany({ status: 'deleted', statusChangedAt: { $lt: defaultDeleteThreshold } });
            */

            return stats;
        } catch (err) {
            this.logger.error('[PruningService] Error during pruning operation:', err);
            throw err;
        }
    }

    /**
     * Conta quanti record verrebbero influenzati dai parametri di pruning.
     */
    public async countPotentialPruning(params: PruningParams): Promise<number> {
        let total = 0;

        if (params.resetAllToActive) {
            return await ThreatLog.countDocuments({ status: { $ne: 'active' } });
        }

        if (params.archiveDays && params.archiveDays > 0) {
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - params.archiveDays);
            total += await ThreatLog.countDocuments({ status: 'active', timestamp: { $lt: threshold } });
        }

        if (params.retentionDays && params.retentionDays > 0) {
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - params.retentionDays);
            total += await ThreatLog.countDocuments({ status: 'deleted', statusChangedAt: { $lt: threshold } });
        }

        if (params.deletionDays && params.deletionDays > 0) {
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - params.deletionDays);
            total += await ThreatLog.countDocuments({ status: 'archived', statusChangedAt: { $lt: threshold } });
        }

        return total;
    }
}
