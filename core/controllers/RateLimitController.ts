/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { RateLimitService } from '../services/RateLimitService';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { Controller, Post } from '../registry/decorators';

@singleton()
@Controller('/api/ratelimit')
export class RateLimitController {
    constructor(
        @inject(Tokens.RATE_LIMIT_SERVICE_TOKEN) private rateLimitService: RateLimitService,
        @inject(Tokens.LOGGER_TOKEN) private logger: Logger
    ) {}

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
    @Post('/search')
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
