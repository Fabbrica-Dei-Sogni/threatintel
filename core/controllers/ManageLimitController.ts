/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { RateLimitMiddleware } from '../rateLimitMiddleware';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { isValidIp } from '../utils/ipValidator';
import { Controller, Post } from '../registry/decorators';

@singleton()
@Controller('/api')
export class ManageLimitController {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private logger: Logger,
        @inject(Tokens.RATE_LIMIT_MIDDLEWARE_TOKEN) private rateLimitMiddleware: RateLimitMiddleware
    ) { }

    /**
     * @openapi
     * /blacklist-ip:
     *   post:
     *     tags: [System & Security]
     *     summary: Aggiunge manualmente un IP alla blacklist (violazioni)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [ip]
     *             properties:
     *               ip:
     *                 type: string
     *     responses:
     *       200:
     *         description: IP aggiunto alla blacklist.
     */
    @Post('/blacklist-ip')
    async blacklistIP(req: Request, res: Response): Promise<void> {
        const { ip } = req.body;

        if (!ip || typeof ip !== 'string') {
            res.status(400).json({ error: 'IP mancante nel corpo della richiesta' });
            return;
        }

        const trimmedIp = ip.trim();

        if (!isValidIp(trimmedIp)) {
            res.status(400).json({ error: `Formato IP non valido: ${trimmedIp}` });
            return;
        }

        try {
            await this.rateLimitMiddleware.manualBlacklistIP(trimmedIp);
            res.status(200).json({ message: `IP ${trimmedIp} inserito con successo in blacklist.` });
        } catch (error: any) {
            this.logger.error(`[ManageLimitController] Errore durante inserimento IP ${trimmedIp}: ${error.message}`);
            res.status(500).json({ error: 'Errore interno durante la blacklist dell\'IP' });
        }
    }

    /**
     * @openapi
     * /unblacklist-ip:
     *   post:
     *     tags: [System & Security]
     *     summary: Rimuove manualmente un IP dalla blacklist
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [ip]
     *             properties:
     *               ip:
     *                 type: string
     *     responses:
     *       200:
     *         description: IP rimosso dalla blacklist.
     */
    @Post('/unblacklist-ip')
    async unblacklistIP(req: Request, res: Response): Promise<void> {
        const { ip } = req.body;

        if (!ip || typeof ip !== 'string') {
            res.status(400).json({ error: 'IP mancante nel corpo della richiesta' });
            return;
        }

        const trimmedIp = ip.trim();

        if (!isValidIp(trimmedIp)) {
            res.status(400).json({ error: `Formato IP non valido: ${trimmedIp}` });
            return;
        }

        try {
            await this.rateLimitMiddleware.removeIPFromBlacklist(trimmedIp);
            res.status(200).json({ message: `IP ${trimmedIp} rimosso con successo dalla blacklist.` });
        } catch (error: any) {
            this.logger.error(`[ManageLimitController] Errore durante rimozione IP ${trimmedIp}: ${error.message}`);
            res.status(500).json({ error: 'Errore interno durante la rimozione dalla blacklist dell\'IP' });
        }
    }
}
