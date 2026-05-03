/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { ThreatLogService } from '../services/ThreatLogService';
import { IpDetailsService } from '../services/IpDetailsService';
import { SshLogService } from '../services/SshLogService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { assertPublicIp, IpValidationError } from '../utils/ipValidator';
import { sanitizePage, sanitizePageSize, sanitizeLimit } from '../utils/queryGuard';
import { Controller, Get, Post } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = getComponent(AuthMiddleware);

@singleton()
@Controller('/api')
export class ThreatController {
    constructor(
        private threatLogService: ThreatLogService,
        private ipDetailsService: IpDetailsService,
        @inject(LOGGER_TOKEN) private logger: Logger
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
            const minScore = parseInt(req.query.minScore as string) || 15;
            const minLogs = parseInt(req.query.minLogs as string) || 1;
            const topParam = req.query.top as string;
            const top = topParam === 'all' ? -1 : parseInt(topParam) || 10;

            const stats = await this.threatLogService.getStats(timeframe, minScore, top, minLogs);
            const topThreats = await this.threatLogService.getTopThreats(10, timeframe, minScore);

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

            const safePage = sanitizePage(page);
            const safePageSize = sanitizePageSize(pageSize);

            const logs = await this.threatLogService.getLogs({ page: safePage, pageSize: safePageSize, filters });
            const total = await this.threatLogService.countLogs(filters);

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
     * /attack/search:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ricerca attacchi raggruppati
     *     responses:
     *       200:
     *         description: Elenco attacchi aggregati.
     */
    @Post('/attack/search')
    async searchAttacks(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting attack search');
        try {
            const { page = 1, pageSize = 20, filters = {}, minLogsForAttack = 10, timeConfig = {}, sortFields = {} } = req.body;

            const pageNum = sanitizePage(page);
            const pageSizeNum = sanitizePageSize(pageSize);
            const minLogsForAttackNum = Math.min(Math.max(1, parseInt(minLogsForAttack)), 1000);

            const data = await this.threatLogService.getAttacks({
                page: pageNum,
                pageSize: pageSizeNum,
                filters,
                minLogsForAttack: minLogsForAttackNum,
                timeConfig,
                sortFields
            });

            res.json({ attacks: data.items, total: data.totalCount, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error searching attacks:', err);
            res.status(err.status || 500).json({ error: 'Errore recupero attacchi' });
        }
    }

    /**
     * @openapi
     * /attack/details:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli specifici di un attacco
     *     responses:
     *       200:
     *         description: Dettagli dell'attacco.
     */
    @Post('/attack/details')
    async getAttackDetails(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Requesting attack details for IP ${req.body.ip}`);
        try {
            const { ip, minLogsForAttack = 10, timeConfig = {}, protocol } = req.body;
            if (!ip) {
                res.status(400).json({ error: 'IP mancante' });
                return;
            }

            const attack = await this.threatLogService.getAttackDetail({
                ip,
                minLogsForAttack: parseInt(minLogsForAttack),
                timeConfig,
                protocol
            });

            if (!attack) {
                res.status(404).json({ error: 'Attacco non trovato' });
                return;
            }

            res.json(attack);
        } catch (err: any) {
            this.logger.error('[ThreatController] Error fetching attack details:', err);
            res.status(500).json({ error: 'Errore durante il recupero dei dettagli dell\'attacco' });
        }
    }

    /**
     * @openapi
     * /attack/distributed:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli investigativi per un cluster di IP (Attacco Distribuito)
     *     responses:
     *       200:
     *         description: Dettagli dell'attacco distribuito.
     */
    @Post('/attack/distributed')
    async getDistributedAttackDetails(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Requesting distributed attack details for ${req.body.ipList?.length || 0} IPs`);
        try {
            const { ipList, minLogsForAttack = 1, timeConfig = {}, protocol } = req.body;

            if (!ipList || !Array.isArray(ipList) || ipList.length === 0) {
                res.status(400).json({ error: 'Lista IP mancante o non valida' });
                return;
            }

            const attack = await this.threatLogService.getDistributedAttackDetail({
                ipList,
                minLogsForAttack: parseInt(minLogsForAttack),
                timeConfig,
                protocol
            });

            if (!attack) {
                res.status(404).json({ error: 'Nessun dato trovato per il cluster di IP fornito' });
                return;
            }

            res.json(attack);
        } catch (err: any) {
            this.logger.error('[ThreatController] Error fetching distributed attack details:', err);
            res.status(500).json({ error: 'Errore durante l\'analisi investigativa distribuita' });
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
     *     summary: Ri-analizza tutti i log presenti nel DB (Admin Only)
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Processo avviato.
     */
    @Post('/reanalyze-all', [auth.hasRole('admin')])
    async reanalyzeAll(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Starting full logs reanalysis');
        try {
            const { batchSize = 100, updateDatabase = true } = req.body;
            const safeBatchSize = sanitizeLimit(batchSize, 500, 100);
            const resultHttp = await this.threatLogService.analyzeLogs({ batchSize: safeBatchSize, updateDatabase: updateDatabase === true });            // const resultSsh = await this.sshLogService.analyzeSshLogs(batchSize);

            res.json({ http: resultHttp, ssh: null });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error during reanalysis:', err);
            res.status(err.status || 500).json({ error: 'Errore durante rianalisi di tutti i log', details: err.message });
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

}

