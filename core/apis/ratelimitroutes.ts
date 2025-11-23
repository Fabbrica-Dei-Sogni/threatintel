import express from 'express';
import dotenv from 'dotenv';
import { uriDigitalAuth } from '../config';

dotenv.config();

export default (logger: any, rateLimitService: any) => {
    const router = express.Router();

    router.post('/api/ratelimit/search', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di ricerca ratelimits');

        try {
            const { page = 1, pageSize = 20, filters = {} } = req.body;

            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));

            const bobjs = await rateLimitService.getEventsByIp({ page: pageNum, pageSize: pageSizeNum, filters });
            const total = await rateLimitService.countEventsByIp(filters);

            res.json({ bobjs, total, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            logger.error('Errore recupero ratelimits:', err);
            res.status(500).json({ error: 'Errore recupero ratelimits' });
        }
    });

    return router;
};
