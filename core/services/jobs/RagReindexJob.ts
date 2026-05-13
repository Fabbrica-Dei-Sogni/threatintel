import { inject, injectable } from 'tsyringe';
import * as Tokens from '../../di/tokens';
import { Logger } from 'winston';
import { IBackgroundJob } from '../../types/jobs';
import { RagSyncService } from '../assistant/RagSyncService';
import AnalysisJob, { JobStatus } from '../../models/AnalysisJobSchema';
import { EventBus, AppEvents } from '../EventBus';

@injectable()
export class RagReindexJob implements IBackgroundJob {
    public readonly type = 'rag_reindex';
    private isStopped = false;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService,
        @inject(Tokens.EVENT_BUS_TOKEN) private readonly eventBus: EventBus
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
                this.logger.info(`[RagReindexJob] Conteggio punti obsoleti per ${collection}...`);
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
                let currentOffset = undefined;

                while (hasMore && !this.isStopped) {
                    this.logger.debug(`[RagReindexJob] Richiesta batch di re-indexing per ${collection} (Offset: ${currentOffset || 'inizio'})...`);
                    
                    const result = await this.ragSync.reindexObsoletePoints(
                        collection, 
                        batchSize, 
                        thresholdDate, 
                        currentOffset,
                        async (itemStats) => {
                            // Aggiornamento granulare per ogni punto
                            totalProcessed += itemStats.processed;
                            totalUpdated += itemStats.updated;
                            totalDeleted += itemStats.deleted;

                            const progress = totalToProcess > 0 
                                ? Math.min(100, Math.round((totalProcessed / totalToProcess) * 100)) 
                                : 0;

                            await AnalysisJob.findByIdAndUpdate(jobId, {
                                $set: {
                                    progress,
                                    'metadata.processed': totalProcessed,
                                    'metadata.updated': totalUpdated,
                                    'metadata.deleted': totalDeleted
                                }
                            });

                            // Emissione evento per WebSockets
                            this.eventBus.emit(AppEvents.JOB_PROGRESS, {
                                id: jobId,
                                jobName: this.type,
                                status: JobStatus.RUNNING,
                                progress,
                                metadata: {
                                    processed: totalProcessed,
                                    total: totalToProcess,
                                    updated: totalUpdated,
                                    deleted: totalDeleted
                                }
                            });
                        }
                    );

                    this.logger.debug(`[RagReindexJob] Batch completato per ${collection}. Offset successivo: ${result.nextOffset || 'nessuno'}`);
                    
                    // Nota: totalProcessed e altri sono già stati aggiornati dal callback per ogni item
                    currentOffset = result.nextOffset;

                    if (!currentOffset || result.processed === 0) {
                        hasMore = false;
                    }
                }
            }

            if (this.isStopped) {
                this.logger.info(`[RagReindexJob] Job ${jobId} interrotto dall'utente.`);
                await AnalysisJob.findByIdAndUpdate(jobId, {
                    $set: { status: JobStatus.CANCELLED }
                });
            } else {
                this.logger.info(`[RagReindexJob] Job ${jobId} completato con successo. Processati: ${totalProcessed}, Aggiornati: ${totalUpdated}, Eliminati: ${totalDeleted}`);
                // Lasciamo che sia il BackgroundJobManager a marcare come COMPLETED e a inviare l'evento finale
                // ma aggiorniamo i contatori finali
                await AnalysisJob.findByIdAndUpdate(jobId, {
                    $set: { 
                        progress: 100,
                        'metadata.processed': totalProcessed,
                        'metadata.updated': totalUpdated,
                        'metadata.deleted': totalDeleted
                    }
                });
            }

        } catch (err: any) {
            this.logger.error(`[RagReindexJob] Errore critico nel job ${jobId}:`, err);
            
            await AnalysisJob.findByIdAndUpdate(jobId, {
                $set: { 
                    status: JobStatus.FAILED,
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
