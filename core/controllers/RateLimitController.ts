import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { RateLimitService } from '../services/RateLimitService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class RateLimitController {
    constructor(
        private rateLimitService: RateLimitService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

    // POST /api/ratelimit/search
    async searchRateLimits(req: Request, res: Response): Promise<void> {
        this.logger.info('[RateLimitController] Searching rate limits');
        try {
            const { page = 1, pageSize = 20, filters = {} } = req.body;

            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));

            const bobjs = await this.rateLimitService.getEventsByIp({ page: pageNum, pageSize: pageSizeNum, filters });
            const total = await this.rateLimitService.countEventsByIp(filters);

            res.json({ bobjs, total, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            this.logger.error('[RateLimitController] Error fetching rate limits:', err);
            res.status(500).json({ error: 'Errore recupero ratelimits' });
        }
    }
}
