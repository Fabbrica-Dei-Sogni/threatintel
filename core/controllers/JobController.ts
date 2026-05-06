import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { BackgroundJobManager } from '../services/BackgroundJobManager';
import { Controller, Get, Post, Delete } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = () => getComponent<AuthMiddleware>(Tokens.AUTH_MIDDLEWARE_TOKEN);

@singleton()
@Controller('/api/jobs')
export class JobController {
    constructor(
        @inject(Tokens.BACKGROUND_JOB_MANAGER_TOKEN) private readonly jobManager: BackgroundJobManager,
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {}

    /**
     * Elenca i job recenti.
     */
    @Get('')
    async listJobs(req: Request, res: Response): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const jobs = await this.jobManager.listJobs(limit);
            res.json(jobs);
        } catch (err: any) {
            this.logger.error('[JobController] Error listing jobs:', err);
            res.status(500).json({ error: 'Errore durante il recupero dei job' });
        }
    }

    /**
     * Ottiene lo stato di un job specifico.
     */
    @Get('/:id')
    async getJobStatus(req: Request, res: Response): Promise<void> {
        try {
            const job = await this.jobManager.getJobStatus(req.params.id as string);
            if (!job) {
                res.status(404).json({ error: 'Job non trovato' });
                return;
            }
            res.json(job);
        } catch (err: any) {
            this.logger.error('[JobController] Error getting job status:', err);
            res.status(500).json({ error: 'Errore durante il recupero dello stato del job' });
        }
    }

    /**
     * Avvia un nuovo job.
     */
    @Post('')
    async startJob(req: Request, res: Response): Promise<void> {
        const { type, params } = req.body;
        const user = (req as any).user?.name || 'system';

        try {
            if (!type) {
                res.status(400).json({ error: 'Tipo di job (type) obbligatorio' });
                return;
            }

            const job = await this.jobManager.startJob(type, params, user);
            res.status(202).json({
                message: 'Job avviato con successo',
                jobId: job.id,
                status: job.status
            });
        } catch (err: any) {
            this.logger.error('[JobController] Error starting job:', err);
            res.status(500).json({ error: 'Errore durante l\'avvio del job', details: err.message });
        }
    }

    /**
     * Ferma un job in corso.
     */
    @Delete('/:id')
    async stopJob(req: Request, res: Response): Promise<void> {
        try {
            await this.jobManager.stopJob(req.params.id as string);
            res.json({ message: 'Richiesta di arresto inviata' });
        } catch (err: any) {
            this.logger.error('[JobController] Error stopping job:', err);
            res.status(500).json({ error: 'Errore durante l\'arresto del job' });
        }
    }

    /**
     * Rimuove definitivamente un job.
     */
    @Delete('/:id/purge')
    async purgeJob(req: Request, res: Response): Promise<void> {
        try {
            await this.jobManager.deleteJob(req.params.id as string);
            res.json({ message: 'Job rimosso definitivamente' });
        } catch (err: any) {
            this.logger.error('[JobController] Error purging job:', err);
            res.status(500).json({ error: 'Errore durante la rimozione del job' });
        }
    }
}
