import { inject, injectable } from 'tsyringe';
import * as Tokens from '../../di/tokens';
import { Logger } from 'winston';
import { IBackgroundJob } from '../../types/jobs';
import { RagSyncService } from '../assistant/RagSyncService';
import AnalysisJob from '../../models/AnalysisJobSchema';

@injectable()
export class RagReindexJob implements IBackgroundJob {
    public readonly type = 'rag_reindex';
    private isStopped = false;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService
    ) { }

    async execute(jobId: string, params: any): Promise<void> {
        this.isStopped = false;
        const batchSize = params.batchSize || 50;

        this.logger.info(`[RagReindexJob] Avvio re-indexing RAG per il job ${jobId}...`);

        try {
            const collections = [
                this.ragSync.getStatus().intelligenceCollection,
                this.ragSync.getStatus().logsCollection
            ].filter(Boolean) as string[];

            let totalToProcess = 0;
            for (const collection of collections) {
                const count = await this.ragSync.countObsoletePoints(collection);
                totalToProcess += count;
            }

            this.logger.info(`[RagReindexJob] Totale punti obsoleti rilevati: ${totalToProcess}`);
            
            // Inizializziamo il totale nel database
            await AnalysisJob.findByIdAndUpdate(jobId, {
                $set: { 'metadata.total': totalToProcess }
            });

            let totalProcessed = 0;
            let totalUpdated = 0;
            let totalDeleted = 0;

            for (const collection of collections) {
                if (this.isStopped) break;

                this.logger.info(`[RagReindexJob] Processamento collection: ${collection}`);

                let hasMore = true;
                while (hasMore && !this.isStopped) {
                    const result = await this.ragSync.reindexObsoletePoints(collection, batchSize);

                    totalProcessed += result.processed;
                    totalUpdated += result.updated;
                    totalDeleted += result.deleted;

                    // Calcoliamo la percentuale di progresso
                    const progress = totalToProcess > 0 
                        ? Math.round((totalProcessed / totalToProcess) * 100) 
                        : 0;

                    // Aggiorniamo il progresso nel database usando $set per sicurezza
                    await AnalysisJob.findByIdAndUpdate(jobId, {
                        $set: {
                            progress,
                            'metadata.processed': totalProcessed,
                            'metadata.updated': totalUpdated,
                            'metadata.deleted': totalDeleted,
                            'metadata.total': totalToProcess // Riaffermiamo il totale
                        }
                    });

                    if (result.processed === 0) {
                        hasMore = false;
                    }
                }
            }

            if (this.isStopped) {
                this.logger.info(`[RagReindexJob] Job ${jobId} interrotto dall'utente.`);
            } else {
                this.logger.info(`[RagReindexJob] Job ${jobId} completato con successo. Processati: ${totalProcessed}, Aggiornati: ${totalUpdated}, Eliminati: ${totalDeleted}`);
            }

        } catch (err: any) {
            this.logger.error(`[RagReindexJob] Errore critico nel job ${jobId}:`, err);
            throw err;
        }
    }

    async stop(): Promise<void> {
        this.isStopped = true;
    }
}
