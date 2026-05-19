import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { ThreatLogService } from '../services/ThreatLogService';
import { IpDetailsService } from '../services/IpDetailsService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { assertPublicIp, IpValidationError } from '../utils/ipValidator';
import { sanitizePage, sanitizePageSize, sanitizeLimit } from '../utils/queryGuard';
import { Controller, Get, Post } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import { StatusManagerService } from '../services/StatusManagerService';
import { BackgroundJobManager } from '../services/BackgroundJobManager';

import * as Tokens from '../di/tokens';

const auth = () => getComponent<AuthMiddleware>(Tokens.AUTH_MIDDLEWARE_TOKEN);

@singleton()
@Controller('/api')
export class ThreatController {
    constructor(
        @inject(Tokens.THREAT_LOG_SERVICE_TOKEN) private readonly threatLogService: ThreatLogService,
        @inject(Tokens.IP_DETAILS_SERVICE_TOKEN) private readonly ipDetailsService: IpDetailsService,
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.STATUS_MANAGER_SERVICE_TOKEN) private readonly statusManager: StatusManagerService,
        @inject(Tokens.BACKGROUND_JOB_MANAGER_TOKEN) private readonly jobManager: BackgroundJobManager
    ) { }

    /**
     * @openapi
     * /stats:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene le statistiche generali delle minacce
     *     parameters:
     *       - name: timeframe
     *         in: query
     *         schema:
     *           type: string
     *           enum: [1h, 24h, 7d, 30d]
     *           default: 24h
     *       - name: minScore
     *         in: query
     *         schema:
     *           type: integer
     *           default: 15
     *       - name: top
     *         in: query
     *         schema:
     *           type: string
     *           default: '10'
     *     responses:
     *       200:
     *         description: Statistiche recuperate con successo.
     */
    @Get('/stats')
    async getStats(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting stats');
        try {
            const timeframe = (req.query.timeframe as string) || '24h';
            const parsedScore = parseInt(req.query.minScore as string);
            const minScore = isNaN(parsedScore) ? 15 : parsedScore;
            const minLogs = parseInt(req.query.minLogs as string) || 1;
            const topParam = req.query.top as string;
            const top = topParam === 'all' ? -1 : parseInt(topParam) || 10;
            
            const protocolsParam = req.query.protocols as string;
            const protocols = protocolsParam ? protocolsParam.split(',').map(p => p.trim()).filter(p => p.length > 0) : [];

            const stats = await this.threatLogService.getStats(timeframe, minScore, top, minLogs, protocols);
            const topThreats = await this.threatLogService.getTopThreats(top, timeframe, minScore, protocols, minLogs);

            res.json({
                stats: stats,
                topThreats: topThreats,
                timestamp: new Date().toISOString()
            });
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero statistiche' });
        }
    }

    /**
     * @openapi
     * /logs:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Recupera la lista dei log delle minacce
     *     parameters:
     *       - name: page
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: pageSize
     *         in: query
     *         schema:
     *           type: integer
     *           default: 20
     *       - name: ip
     *         in: query
     *         schema:
     *           type: string
     *       - name: suspicious
     *         in: query
     *         schema:
     *           type: string
     *           enum: ['true', 'false']
     *     responses:
     *       200:
     *         description: Elenco log restituito.
     */
    @Get('/logs')
    async getLogs(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting logs');
        try {
            const { page = 1, pageSize = 20, ip, suspicious } = req.query as any;
            const filters: any = {};
            if (ip) filters['request.ip'] = ip;
            if (suspicious === 'true') filters['fingerprint.suspicious'] = true;
            else if (suspicious === 'false') filters['fingerprint.suspicious'] = false;

            const logsParams = {
                page: sanitizePage(page),
                pageSize: sanitizePageSize(pageSize),
                filters
            };
            const { logs, total, page: safePage, pageSize: safePageSize } = await this.threatLogService.searchLogs(logsParams);

            res.json({ logs, total, page: safePage, pageSize: safePageSize });
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero log' });
        }
    }

    /**
     * @openapi
     * /search:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ricerca avanzata nei log
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               page:
     *                 type: integer
     *               pageSize:
     *                 type: integer
     *               filters:
     *                 type: object
     *               sortFields:
     *                 type: object
     *     responses:
     *       200:
     *         description: Risultati della ricerca.
     */
    @Post('/search')
    async searchLogs(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting log search');
        try {
            const { page = 1, pageSize = 20, filters = {}, sortFields = {} } = req.body;

            const pageNum = sanitizePage(page);
            const pageSizeNum = sanitizePageSize(pageSize);

            const logs = await this.threatLogService.getLogs({ page: pageNum, pageSize: pageSizeNum, filters, sortFields });
            const total = await this.threatLogService.countLogs(filters);

            res.json({ logs, total, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error searching logs:', err);
            res.status(err.status || 500).json({ error: 'Errore recupero log' });
        }
    }


    /**
     * @openapi
     * /logs/{id}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Recupera un singolo log tramite ID
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dettaglio del log.
     */
    @Get('/logs/:id')
    async getLogById(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Requesting log ${req.params.id}`);
        try {
            const log = await this.threatLogService.getLogById({ id: req.params.id as string });
            if (!log) {
                res.status(404).json({ error: 'Log non trovato' });
                return;
            }
            res.json(log);
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero dettaglio log' });
        }
    }

    /**
     * @openapi
     * /reputationscore/{ip}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Calcola il Reputation Score di un IP
     *     parameters:
     *       - name: ip
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Score calcolato.
     */
    @Get('/reputationscore/:ip')
    async getReputationScore(req: Request, res: Response): Promise<void> {
        try {
            assertPublicIp(req.params.ip as string);
            const user = (req as any).user;
            let reputationData;

            if (user?.username === 'anonymous') {
                // Sola lettura dalla cache per anonimi
                this.logger.info(`[ThreatController] Sola lettura reputazione per anonimo su IP: ${req.params.ip}`);
                reputationData = await this.ipDetailsService.getAbuseCacheOnly(req.params.ip as string);
            } else {
                reputationData = await this.ipDetailsService.enrichWithAbuse(req.params.ip as string);
            }
            if (!reputationData) {
                res.status(404).json({ error: 'Reputation score non trovato' });
                return;
            }
            res.json(reputationData);
        } catch (err: any) {
            if (err instanceof IpValidationError) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.status(err.status || 500).json({ error: 'Errore recupero reputation score' });
        }
    }

    /**
     * @openapi
     * /enrichreports/{ip}:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Arricchisce i report per un IP specifico
     *     responses:
     *       200:
     *         description: Dati arricchiti.
     */
    @Post('/enrichreports/:ip')
    async enrichReports(req: Request, res: Response): Promise<void> {
        const user = (req as any).user;
        if (user?.username === 'anonymous') {
            res.status(403).json({ error: 'Azione consentita solo agli utenti autenticati' });
            return;
        }

        try {
            assertPublicIp(req.params.ip as string);
            const reportsData = await this.ipDetailsService.getAndSaveReportsAbuseIpDb(req.params.ip as string, 2, 100);
            if (!reportsData) {
                res.status(404).json({ error: 'Reports non trovati' });
                return;
            }
            res.json(reportsData);
        } catch (err: any) {
            if (err instanceof IpValidationError) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.status(err.status || 500).json({ error: 'Errore recupero reports' });
        }
    }

    /**
     * @openapi
     * /ipdetail/{ip}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli geolocalizzati e tecnici di un IP
     *     responses:
     *       200:
     *         description: Dettagli IP.
     */
    @Get('/ipdetail/:ip')
    async getIpDetail(req: Request, res: Response): Promise<void> {
        try {
            assertPublicIp(req.params.ip as string);
            const ipDetails = await this.ipDetailsService.getIpDetails({ ip: req.params.ip as string });
            if (!ipDetails) {
                res.status(404).json({ error: 'Ip detail non trovato' });
                return;
            }
            res.json(ipDetails);
        } catch (err: any) {
            if (err instanceof IpValidationError) {
                res.status(400).json({ error: err.message });
                return;
            }
            this.logger.error('[ThreatController] Error fetching IP detail:', err);
            res.status(err.status || 500).json({ error: 'Errore durante recupero IP' });
        }
    }

    /**
     * @openapi
     * /enrich/{ip}:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Esegue l'enrichment manuale di un IP
     *     responses:
     *       200:
     *         description: Enrichment completato.
     */
    @Post('/enrich/:ip')
    async enrichIp(req: Request, res: Response): Promise<void> {
        const user = (req as any).user;
        if (user?.username === 'anonymous') {
            res.status(403).json({ error: 'Azione consentita solo agli utenti autenticati' });
            return;
        }

        try {
            assertPublicIp(req.params.ip as string);
            const ip = (req.params.ip as string).trim();
            const ipDetailsId = await this.ipDetailsService.findOrCreate(ip, true);
            await this.threatLogService.assignIpDetailsToLogs(ip, ipDetailsId);
            res.json({ message: 'Arricchimento IP completato per ' + ip });
        } catch (err: any) {
            if (err instanceof IpValidationError) {
                res.status(400).json({ error: err.message });
                return;
            }
            this.logger.error('[ThreatController] Error enriching IP:', err);
            res.status(err.status || 500).json({ error: 'Errore durante arricchimento IP' });
        }
    }

    /**
     * @openapi
     * /enrich:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Esegue l'enrichment massivo (batch)
     *     responses:
     *       200:
     *         description: Risultati batch.
     */
    @Post('/enrich')
    async batchEnrich(req: Request, res: Response): Promise<void> {
        const user = (req as any).user;
        if (user?.username === 'anonymous') {
            res.status(403).json({ error: 'Azione consentita solo agli utenti autenticati' });
            return;
        }

        this.logger.info('[ThreatController] Starting batch IP enrichment');
        try {
            const uniqueIps = await this.threatLogService.getDistinctIPs();
            const results: any[] = [];
            for (const ip of uniqueIps) {
                const ipDetailsId = await this.ipDetailsService.findOrCreate(ip);
                await this.threatLogService.assignIpDetailsToLogs(ip, ipDetailsId);
                results.push({ ip, ipDetailsId });
            }

            res.json({ message: 'Arricchimento IP completato', processed: results.length, details: results });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error in batch enrichment:', err);
            res.status(err.status || 500).json({ error: 'Errore durante arricchimento IP' });
        }
    }

    /**
     * @openapi
     * /reanalyze-all:
     *   post:
     *     tags: [System & Security]
     *     summary: Ri-analizza tutti i log presenti nel DB (Asincrono)
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       202:
     *         description: Job di ri-analisi avviati.
     */
    @Post('/reanalyze-all', [(req: any, res: any, next: any) => auth().hasRole('admin')(req, res, next)])
    async reanalyzeAll(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Starting asynchronous full logs reanalysis');
        try {
            const { batchSize = 100, updateDatabase = true } = req.body;
            const user = (req as any).user?.name || 'admin';

            // Avviamo il job di ri-analisi HTTP in background
            const httpJob = await this.jobManager.startJob('threat_reanalyze', { batchSize, updateDatabase }, user);
            
            // DISABILITATO SU RICHIESTA UTENTE: ssh_reanalyze sarà un job separato
            // const sshJob = await this.jobManager.startJob('ssh_reanalyze', { batchSize }, user);

            res.status(202).json({ 
                message: 'Processo di ri-analisi HTTP avviato in background',
                jobs: {
                    http: { jobId: httpJob.id, status: httpJob.status }
                    // ssh: { jobId: sshJob.id, status: sshJob.status }
                }
            });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error during reanalysis trigger:', err);
            res.status(err.status || 500).json({ error: 'Errore durante l\'avvio della rianalisi', details: err.message });
        }
    }

    /**
     * @openapi
     * /analyze-preview:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Anteprima dell'analisi dei log
     *     responses:
     *       200:
     *         description: Anteprima generata.
     */
    @Get('/analyze-preview')
    async analyzePreview(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Starting reanalysis preview (dry-run)');
        try {
            const { limit = '100' } = req.query as any;
            const safeLimit = sanitizeLimit(parseInt(limit as string, 10), 500, 100);
            const result = await this.threatLogService.dryRunAnalyzeLogs(safeLimit.toString());
            res.json(result);
        } catch (err: any) {
            this.logger.error('[ThreatController] Error in reanalysis preview:', err);
            res.status(err.status || 500).json({ error: 'Errore durante preview rianalisi', details: err.message });
        }
    }

    /**
     * @openapi
     * /status:
     *   post:
     *     tags: [Log Management]
     *     summary: Cambia lo stato di un log, attacco o campagna (active, archived, deleted)
     *     responses:
     *       202:
     *         description: Richiesta accettata.
     */
    @Post('/status', [(req: any, res: any, next: any) => auth().isAuthenticated()(req, res, next)])
    async changeStatus(req: Request, res: Response): Promise<void> {
        const { type, id, status, reason = 'manual_update' } = req.body;
        const user = (req as any).user?.name || 'anonymous';

        try {
            if (!type || !id || !status) {
                res.status(400).json({ error: 'Parametri type, id e status obbligatori' });
                return;
            }

            await this.statusManager.processStatusChange(type, id, status, reason, user);

            res.status(202).json({
                message: 'Richiesta di cambio stato presa in carico',
                operation: { type, id, status, user }
            });
        } catch (err: any) {
            this.logger.error('[ThreatController] Change Status error:', err);
            res.status(500).json({ error: 'Errore durante la richiesta di cambio stato' });
        }
    }

    /**
     * @openapi
     * /restore:
     *   post:
     *     tags: [Log Management]
     *     summary: Ripristina i log da un contesto di archiviazione
     *     responses:
     *       202:
     *         description: Ripristino avviato.
     */
    @Post('/restore', [(req: any, res: any, next: any) => auth().isAuthenticated()(req, res, next)])
    async restore(req: Request, res: Response): Promise<void> {
        const { sourceId } = req.body;
        const user = (req as any).user?.name || 'anonymous';

        try {
            if (!sourceId) {
                res.status(400).json({ error: 'Parametro sourceId obbligatorio' });
                return;
            }

            await this.statusManager.restoreByContext(sourceId, user);

            res.status(202).json({
                message: 'Ripristino contesto avviato',
                sourceId,
                user
            });
        } catch (err: any) {
            this.logger.error('[ThreatController] Restore error:', err);
            res.status(500).json({ error: 'Errore durante il ripristino' });
        }
    }
}

