import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { CampaignService } from '../services/CampaignService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { sanitizeFilters, sanitizePage, sanitizePageSize, FilterAllowedFields } from '../utils/queryGuard';
import { Controller, Get, Post } from '../registry/decorators';

@singleton()
@Controller('/api/campaign')
export class CampaignController {
    constructor(
        private campaignService: CampaignService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) { }

    /**
     * @openapi
     * /campaign/search:
     *   get:
     *     tags: [Campaigns Analysis]
     *     summary: Scopre pattern di attacco (hash) condivisi da più IP
     *     parameters:
     *       - name: minIps
     *         in: query
     *         schema:
     *           type: integer
     *           default: 2
     *       - name: minScore
     *         in: query
     *         schema:
     *           type: integer
     *           default: 0
     *       - name: minLogsPerIp
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: protocol
     *         in: query
     *         schema:
     *           type: string
     *           enum: [http, telnet, ssh]
     *           default: http
     *       - name: page
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: pageSize
     *         in: query
     *         schema:
     *           type: integer
     *           default: 10
     *       - name: search
     *         in: query
     *         schema:
     *           type: string
     *           default: ''
     *     responses:
     *       200:
     *         description: Elenco campagne distribuite trovate.
     */
    @Get('/search')
    async getCampaigns(req: Request, res: Response): Promise<void> {
        this.logger.info('[CampaignController] Requesting distributed campaigns discovery');
        try {
            // Sanificazione tramite whitelist centralizzata
            const cleanQuery = sanitizeFilters(req.query, FilterAllowedFields.campaign);
            
            const pageNum = sanitizePage(cleanQuery.page);
            const pageSizeNum = sanitizePageSize(cleanQuery.pageSize, 100, 10);
            
            // Parametri specifici convertiti in numero
            const minIpsNum = parseInt(cleanQuery.minIps as string) || 2;
            const minScoreNum = parseInt(cleanQuery.minScore as string) || 0;
            const minLogsPerIpNum = parseInt(cleanQuery.minLogsPerIp as string) || 1;
            const minCorrelationsNum = parseInt(cleanQuery.minCorrelations as string) || 0;
            
            const result = await this.campaignService.getCampaigns({ 
                timeConfig: {
                    startTime: cleanQuery.startTime as string, 
                    endTime: cleanQuery.endTime as string,
                    timeMode: cleanQuery.timeMode as 'ago' | 'range',
                    agoValue: cleanQuery.agoValue ? parseInt(cleanQuery.agoValue as string) : undefined,
                    agoUnit: cleanQuery.agoUnit as string
                }, 
                minIps: minIpsNum,
                minScore: minScoreNum,
                minLogsPerIp: minLogsPerIpNum,
                minCorrelations: minCorrelationsNum,
                protocol: cleanQuery.protocol as string,
                page: pageNum,
                pageSize: pageSizeNum,
                selectedUris: Array.isArray(cleanQuery.selectedUris) 
                    ? cleanQuery.selectedUris 
                    : (cleanQuery.selectedUris ? [cleanQuery.selectedUris as string] : []),
                search: cleanQuery.search as string,
                status: cleanQuery.status as string
            });

            res.json({ 
                campaigns: result.campaigns, 
                total: result.total,
                metadata: result.metadata
            });
        } catch (err: any) {
            this.logger.error('[CampaignController] Error in campaigns discovery:', err);
            res.status(500).json({ error: 'Errore durante la scoperta delle campagne' });
        }
    }

    /**
     * @openapi
     * /campaign/detail:
     *   post:
     *     tags: [Campaigns Analysis]
     *     summary: Ottiene dettagli forensi aggregati per una campagna
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [hash]
     *             properties:
     *               hash:
     *                 type: string
     *               minLogsPerIp:
     *                 type: integer
     *               minScore:
     *                 type: number
     *     responses:
     *       200:
     *         description: Dettagli della campagna.
     */
    @Post('/detail')
    async getCampaignDetail(req: Request, res: Response): Promise<void> {
        const hash = req.body.hash;
        this.logger.info(`[CampaignController] Requesting campaign details for hash ${hash}`);
        try {
            if (!hash || typeof hash !== 'string') {
                res.status(400).json({ error: 'Hash mancante o non valido' });
                return;
            }

            // Sanitizziamo i filtri di base
            const cleanBody = sanitizeFilters(req.body, FilterAllowedFields.campaign);

            const pageNum = sanitizePage(cleanBody.page || req.body.page);
            const pageSizeNum = sanitizePageSize(cleanBody.pageSize || req.body.pageSize, 100, 10);
            const minLogsNum = parseInt(cleanBody.minLogsPerIp as string || req.body.minLogsPerIp) || 1;
            const minScoreNum = parseFloat(cleanBody.minScore as string || req.body.minScore) || 0;
            
            // Gestione timeConfig sicuro
            const rawTimeConfig = req.body.timeConfig || {};
            const safeTimeConfig = {
                startTime: typeof rawTimeConfig.startTime === 'string' ? rawTimeConfig.startTime : undefined,
                endTime: typeof rawTimeConfig.endTime === 'string' ? rawTimeConfig.endTime : undefined,
                timeMode: typeof rawTimeConfig.timeMode === 'string' ? rawTimeConfig.timeMode : undefined,
                agoValue: rawTimeConfig.agoValue ? parseInt(rawTimeConfig.agoValue as string) : undefined,
                agoUnit: typeof rawTimeConfig.agoUnit === 'string' ? rawTimeConfig.agoUnit : undefined
            };

            this.logger.debug(`[CampaignController] Params: page=${pageNum}, size=${pageSizeNum}, minLogs=${minLogsNum}, score=${minScoreNum}`);

            const campaign = await this.campaignService.getCampaignDetail({
                hash,
                minLogsPerIp: minLogsNum,
                minScore: minScoreNum,
                protocol: typeof cleanBody.protocol === 'string' ? cleanBody.protocol : (typeof req.body.protocol === 'string' ? req.body.protocol : null),
                timeConfig: safeTimeConfig,
                page: pageNum,
                pageSize: pageSizeNum,
                status: cleanBody.status as string || req.body.status
            });

            if (!campaign) {
                res.status(404).json({ error: 'Campagna non trovata' });
                return;
            }

            res.json(campaign);
        } catch (err: any) {
            this.logger.error('[CampaignController] Error fetching campaign details:', err);
            res.status(500).json({ error: 'Errore durante il recupero del dettaglio campagna' });
        }
    }

    /**
     * @openapi
     * /campaign/uris:
     *   get:
     *     tags: [Campaigns Analysis]
     *     summary: Ottiene gli URI unici (Target URLs) coinvolti nelle campagne
     *     parameters:
     *       - name: protocol
     *         in: query
     *         schema:
     *           type: string
     *       - name: minIps
     *         in: query
     *         schema:
     *           type: integer
     *       - name: minScore
     *         in: query
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Elenco degli URI con conteggi.
     */
    @Get('/uris')
    async getUniqueUris(req: Request, res: Response): Promise<void> {
        this.logger.info('[CampaignController] Requesting unique URIs from campaigns');
        try {
            const cleanQuery = sanitizeFilters(req.query, FilterAllowedFields.campaign);
            
            const pageNum = sanitizePage(cleanQuery.page);
            const pageSizeNum = sanitizePageSize(cleanQuery.pageSize, 100, 20);
            
            const result = await this.campaignService.getUniqueSampleUrls({
                protocol: cleanQuery.protocol as string,
                minIps: parseInt(cleanQuery.minIps as string) || 2,
                minScore: parseInt(cleanQuery.minScore as string) || 0,
                page: pageNum,
                pageSize: pageSizeNum,
                sortBy: cleanQuery.sortBy as string || 'count',
                order: cleanQuery.order ? parseInt(cleanQuery.order as string) : -1,
                timeConfig: {
                    startTime: cleanQuery.startTime as string,
                    endTime: cleanQuery.endTime as string,
                    timeMode: cleanQuery.timeMode as 'ago' | 'range',
                    agoValue: cleanQuery.agoValue ? parseInt(cleanQuery.agoValue as string) : undefined,
                    agoUnit: cleanQuery.agoUnit as string
                },
                status: cleanQuery.status as string
            });

            res.json(result);
        } catch (err: any) {
            this.logger.error('[CampaignController] Error fetching unique URIs:', err);
            res.status(500).json({ error: 'Errore durante il recupero degli URI unici' });
        }
    }
}
