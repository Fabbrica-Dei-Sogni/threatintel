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
            // Assicuriamoci che il sistema RAG sia inizializzato e operativo
            await this.ragSync.initialize();
            
            if (!this.ragSync.getStatus().operational) {
                throw new Error('Il sistema RAG non è operativo. Verificare la connessione con Qdrant.');
            }
            
            // Calcoliamo la soglia temporale una sola volta all'inizio del job
            // per evitare l'effetto "moving target" durante il processamento
            const thresholdMs = this.ragSync.getStatus().thresholdDays * 24 * 60 * 60 * 1000;
            const thresholdDate = new Date(Date.now() - thresholdMs).toISOString();

            const collections = [
                this.ragSync.getStatus().intelligenceCollection,
                this.ragSync.getStatus().logsCollection
            ].filter(Boolean) as string[];

            let totalToProcess = 0;
            for (const collection of collections) {
                const count = await this.ragSync.countObsoletePoints(collection, thresholdDate);
                totalToProcess += count;
            }

            this.logger.info(`[RagReindexJob] Totale punti obsoleti rilevati: ${totalToProcess} (Soglia: ${thresholdDate})`);
            
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
                    const result = await this.ragSync.reindexObsoletePoints(collection, batchSize, thresholdDate);

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
                await AnalysisJob.findByIdAndUpdate(jobId, {
                    $set: { status: 'cancelled' as any }
                });
            } else {
                this.logger.info(`[RagReindexJob] Job ${jobId} completato con successo. Processati: ${totalProcessed}, Aggiornati: ${totalUpdated}, Eliminati: ${totalDeleted}`);
                await AnalysisJob.findByIdAndUpdate(jobId, {
                    $set: { 
                        status: 'completed' as any,
                        progress: 100,
                        completedAt: new Date()
                    }
                });
            }

        } catch (err: any) {
            this.logger.error(`[RagReindexJob] Errore critico nel job ${jobId}:`, err);
            
            await AnalysisJob.findByIdAndUpdate(jobId, {
                $set: { 
                    status: 'failed' as any,
                    error: err.message,
                    completedAt: new Date()
                }
            });

            throw err;
        }
    }

    async stop(): Promise<void> {
        this.isStopped = true;
    }
}
