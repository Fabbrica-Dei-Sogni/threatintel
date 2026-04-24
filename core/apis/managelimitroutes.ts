import express from 'express';
import { ManageLimitController } from '../controllers/ManageLimitController';

export default (manageLimitController: ManageLimitController) => {
    const router = express.Router();

    /**
     * @openapi
     * /blacklist-ip:
     *   post:
     *     tags: [System & Security]
     *     summary: Aggiunge manualmente un IP alla blacklist (violazioni)
     *     responses:
     *       200:
     *         description: IP aggiunto alla blacklist.
     */
    router.post('/api/blacklist-ip', (req, res) => manageLimitController.blacklistIP(req, res));

    /**
     * @openapi
     * /unblacklist-ip:
     *   post:
     *     tags: [System & Security]
     *     summary: Rimuove manualmente un IP dalla blacklist
     *     responses:
     *       200:
     *         description: IP rimosso dalla blacklist.
     */
    router.post('/api/unblacklist-ip', (req, res) => manageLimitController.unblacklistIP(req, res));

    return router;
};
