import express from 'express';
import { RateLimitController } from '../controllers/RateLimitController';

export default (rateLimitController: RateLimitController) => {
    const router = express.Router();

    /**
     * @openapi
     * /ratelimit/search:
     *   post:
     *     tags: [System & Security]
     *     summary: Ricerca nei log dei blocchi di rate limiting
     *     responses:
     *       200:
     *         description: Risultati ricerca.
     */
    router.post('/api/ratelimit/search', (req, res) => rateLimitController.searchRateLimits(req, res));

    return router;
};
