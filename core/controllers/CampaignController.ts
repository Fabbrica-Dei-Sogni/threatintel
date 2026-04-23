import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { CampaignService } from '../services/CampaignService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

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
            const { startTime, endTime, minIps = 2 } = req.query as any;
            const timeConfig = { startTime, endTime };
            const minIpsNum = parseInt(minIps) || 2;

            const campaigns = await this.campaignService.getCampaigns({ timeConfig, minIps: minIpsNum });

            res.json({ campaigns, count: campaigns.length });
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
        this.logger.info(`[CampaignController] Requesting campaign details for hash ${req.body.hash}`);
        try {
            const { ips, hash, minLogsForAttack = 1, timeConfig = {} } = req.body;
            if (!hash) {
                res.status(400).json({ error: 'Hash mancante' });
                return;
            }

            const campaign = await this.campaignService.getCampaignDetail({
                ips,
                hash,
                minLogsForAttack: parseInt(minLogsForAttack),
                timeConfig
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
