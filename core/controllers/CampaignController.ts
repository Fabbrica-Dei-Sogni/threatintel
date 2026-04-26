import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { CampaignService } from '../services/CampaignService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { sanitizeFilters, sanitizePage, sanitizePageSize, FilterAllowedFields } from '../utils/queryGuard';

@singleton()
export class CampaignController {
    constructor(
        private campaignService: CampaignService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) { }

    /**
     * GET /api/campaigns
     * Scopre pattern di attacco (hash) condivisi da più IP
     */
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
            
            const result = await this.campaignService.getCampaigns({ 
                timeConfig: {
                    startTime: cleanQuery.startTime as string, 
                    endTime: cleanQuery.endTime as string,
                    timeMode: cleanQuery.timeMode as string,
                    agoValue: cleanQuery.agoValue ? parseInt(cleanQuery.agoValue as string) : undefined,
                    agoUnit: cleanQuery.agoUnit as string
                }, 
                minIps: minIpsNum,
                minScore: minScoreNum,
                minLogsPerIp: minLogsPerIpNum,
                protocol: cleanQuery.protocol as string,
                page: pageNum,
                pageSize: pageSizeNum
            });

            res.json({ 
                campaigns: result.campaigns, 
                count: result.count,
                metadata: result.metadata
            });
        } catch (err: any) {
            this.logger.error('[CampaignController] Error in campaigns discovery:', err);
            res.status(500).json({ error: 'Errore durante la scoperta delle campagne' });
        }
    }

    /**
     * POST /api/campaign/details
     * Ottiene dettagli forensi aggregati per una campagna
     */
    async getCampaignDetail(req: Request, res: Response): Promise<void> {
        const hash = req.body.hash;
        this.logger.info(`[CampaignController] Requesting campaign details for hash ${hash}`);
        try {
            const { 
                ips, 
                minLogsPerIp = 1, minScore = 0, 
                protocol = null, timeConfig = {},
                page = 1, pageSize = 10 
            } = req.body;
            
            if (!hash) {
                res.status(400).json({ error: 'Hash mancante' });
                return;
            }

            const pageNum = Math.max(1, parseInt(page as any) || 1);
            const pageSizeNum = Math.max(1, parseInt(pageSize as any) || 10);
            const minLogsNum = parseInt(minLogsPerIp as any) || 1;
            const minScoreNum = parseFloat(minScore as any) || 0;

            this.logger.debug(`[CampaignController] Params: page=${pageNum}, size=${pageSizeNum}, minLogs=${minLogsNum}, score=${minScoreNum}`);

            const campaign = await this.campaignService.getCampaignDetail({
                ips,
                hash,
                minLogsPerIp: minLogsNum,
                minScore: minScoreNum,
                protocol,
                timeConfig,
                page: pageNum,
                pageSize: pageSizeNum
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
}
