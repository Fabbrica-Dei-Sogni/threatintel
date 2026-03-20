import express from 'express';
import { RateLimitController } from '../controllers/RateLimitController';

export default (rateLimitController: RateLimitController) => {
    const router = express.Router();

    router.post('/api/ratelimit/search', (req, res) => rateLimitController.searchRateLimits(req, res));

    return router;
};
