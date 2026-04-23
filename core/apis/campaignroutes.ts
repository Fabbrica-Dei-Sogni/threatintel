import express from 'express';
import { CampaignController } from '../controllers/CampaignController';

export default (campaignController: CampaignController) => {
    const router = express.Router();

    /**
     * @openapi
     * /campaigns:
     *   get:
     *     tags: [Campaigns Analysis]
     *     summary: Scopre pattern di attacco (hash) condivisi da più IP
     *     responses:
     *       200:
     *         description: Elenco campagne distribuite trovate.
     */
    router.get('/api/campaigns', (req, res) => campaignController.getCampaigns(req, res));

    /**
     * @openapi
     * /campaign/details:
     *   post:
     *     tags: [Campaigns Analysis]
     *     summary: Ottiene dettagli forensi aggregati per una campagna
     *     responses:
     *       200:
     *         description: Dettagli della campagna.
     */
    router.post('/api/campaign/details', (req, res) => campaignController.getCampaignDetail(req, res));

    return router;
};
