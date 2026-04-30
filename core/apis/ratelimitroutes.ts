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
     *     responses:
     *       200:
     *         description: Risultati ricerca.
     */
    router.post('/api/ratelimit/search', (req, res) => rateLimitController.searchRateLimits(req, res));

    return router;
};
