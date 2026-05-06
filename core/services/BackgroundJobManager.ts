import { inject, singleton } from 'tsyringe';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import AnalysisJob, { JobStatus, IAnalysisJob } from '../models/AnalysisJobSchema';
import { IBackgroundJob } from '../types/jobs';
import { container } from '../di/container';

@singleton()
export class BackgroundJobManager {
    private activeJobs: Map<string, IBackgroundJob> = new Map();

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {
        // Avviamo la pulizia dei job orfani all'avvio del servizio
        this.cleanupStaleJobs().catch(err => {
            this.logger.error('[BackgroundJobManager] Errore durante la pulizia dei job obsoleti:', err);
        });
    }

    /**
     * Identifica i job che risultano "RUNNING" o "PENDING" ma che non possono essere attivi 
     * (es. a causa di un riavvio forzato del server) e li marca come FAILED.
     */
    private async cleanupStaleJobs(): Promise<void> {
        try {
            const result = await AnalysisJob.updateMany(
                { status: { $in: [JobStatus.RUNNING, JobStatus.PENDING] } },
                { 
                    status: JobStatus.FAILED, 
                    error: 'Job interrotto a causa del riavvio del sistema',
                    completedAt: new Date()
                }
            );
            
            if (result.modifiedCount > 0) {
                this.logger.info(`[BackgroundJobManager] Puliti ${result.modifiedCount} job "zombie" rimasti appesi.`);
            }
        } catch (err) {
            this.logger.error('[BackgroundJobManager] Fallimento cleanupStaleJobs:', err);
        }
    }

    /**
     * Avvia un job in background.
     * @param type Tipo di job (deve essere registrato nel DI container con il relativo token)
     * @param params Parametri per l'esecuzione
     * @param userId Utente che ha avviato il job
     */
    async startJob(type: string, params: any = {}, userId: string = 'system'): Promise<IAnalysisJob> {
        // Creazione record sul database
        const jobDoc = await AnalysisJob.create({
            type,
            status: JobStatus.PENDING,
            metadata: {
                params,
                processed: 0,
                total: 0,
                errors: []
            },
            createdBy: userId
        });

        // Risoluzione dell'istanza del job dal container
        // Nota: usiamo una convenzione per i token dei job, es. SSH_REANALYZE_JOB_TOKEN
        const jobToken = this.resolveTokenByType(type);
        if (!jobToken) {
            jobDoc.status = JobStatus.FAILED;
            jobDoc.error = `Tipo di job non supportato: ${type}`;
            await jobDoc.save();
            throw new Error(jobDoc.error);
        }

        const jobInstance = container.resolve<IBackgroundJob>(jobToken);
        
        // Esecuzione asincrona (non attendiamo il completamento)
        this.runJob(jobDoc.id, jobInstance, params).catch(err => {
            this.logger.error(`[BackgroundJobManager] Errore critico nel job ${jobDoc.id}:`, err);
        });

        return jobDoc;
    }

    private async runJob(jobId: string, jobInstance: IBackgroundJob, params: any) {
        this.activeJobs.set(jobId, jobInstance);
        
        try {
            await AnalysisJob.findByIdAndUpdate(jobId, { 
                status: JobStatus.RUNNING,
                startedAt: new Date()
            });

            await jobInstance.execute(jobId, params);

            await AnalysisJob.findByIdAndUpdate(jobId, { 
                status: JobStatus.COMPLETED,
                completedAt: new Date(),
                progress: 100
            });
            
            this.logger.info(`[BackgroundJobManager] Job ${jobId} completato con successo.`);
        } catch (err: any) {
            this.logger.error(`[BackgroundJobManager] Job ${jobId} fallito:`, err);
            await AnalysisJob.findByIdAndUpdate(jobId, { 
                status: JobStatus.FAILED,
                completedAt: new Date(),
                error: err.message
            });
        } finally {
            this.activeJobs.delete(jobId);
        }
    }

    async stopJob(jobId: string): Promise<void> {
        const jobInstance = this.activeJobs.get(jobId);
        if (jobInstance) {
            try {
                await jobInstance.stop();
            } catch (err) {
                this.logger.error(`[BackgroundJobManager] Errore durante l'arresto dell'istanza job ${jobId}:`, err);
            }
            this.activeJobs.delete(jobId);
        }

        // Aggiorna sempre il database se il job è in uno stato che può essere fermato
        const result = await AnalysisJob.findOneAndUpdate(
            { _id: jobId, status: { $in: [JobStatus.RUNNING, JobStatus.PENDING] } },
            { 
                status: JobStatus.CANCELLED,
                completedAt: new Date()
            },
            { new: true }
        );

        if (result) {
            this.logger.info(`[BackgroundJobManager] Job ${jobId} marcato come CANCELLED sul database.`);
        } else {
            this.logger.warn(`[BackgroundJobManager] Tentativo di fermare il job ${jobId} fallito o job già terminato.`);
        }
    }

    /**
     * Rimuove definitivamente un record di job dal database.
     */
    async deleteJob(jobId: string): Promise<void> {
        // Prima tentiamo di fermarlo se è attivo
        await this.stopJob(jobId).catch(() => {});
        
        await AnalysisJob.findByIdAndDelete(jobId);
        this.logger.info(`[BackgroundJobManager] Job ${jobId} rimosso definitivamente dal database.`);
    }

    async getJobStatus(jobId: string): Promise<IAnalysisJob | null> {
        return await AnalysisJob.findById(jobId);
    }

    async listJobs(limit: number = 10): Promise<IAnalysisJob[]> {
        return await AnalysisJob.find().sort({ createdAt: -1 }).limit(limit);
    }

    private resolveTokenByType(type: string): any {
        switch (type) {
            case 'ssh_reanalyze': return Tokens.SSH_REANALYZE_JOB_TOKEN;
            case 'threat_reanalyze': return Tokens.THREAT_REANALYZE_JOB_TOKEN;
            case 'rag_reindex': return Tokens.RAG_REINDEX_JOB_TOKEN;
            case 'reanalyze': return Tokens.REANALYZE_JOB_TOKEN;
            case 'pruning': return Tokens.PRUNING_JOB_TOKEN;
            default: return null;
        }
    }
}
