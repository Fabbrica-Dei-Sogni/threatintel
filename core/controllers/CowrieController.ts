/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { CowrieService } from '../services/CowrieService';
import { I18nService } from '../services/I18nService';
import { Logger } from 'winston';
import { Controller, Get, Post } from '../registry/decorators';

import * as Tokens from '../di/tokens';

@singleton()
@Controller('/api/cowrie')
export class CowrieController {
    constructor(
        @inject(Tokens.COWRIE_SERVICE_TOKEN) private readonly cowrieService: CowrieService,
        @inject(Tokens.I18N_TOKEN) private readonly i18n: I18nService,
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {}
    
    private getLocale(req: Request): string {
        return (req?.query?.locale as string) || 
               (req?.headers ? req.headers['x-locale'] as string : undefined) || 
               (req?.headers ? req.headers['accept-language']?.split(',')[0]?.split(';')[0] : undefined) || 
               'it-IT';
    }

    /**
     * @openapi
     * /cowrie/sessions:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Elenca le sessioni catturate da Cowrie (Telnet/SSH)
     *     parameters:
     *       - name: page
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: pageSize
     *         in: query
     *         schema:
     *           type: integer
     *           default: 20
     *       - name: sort
     *         in: query
     *         description: JSON string per l'ordinamento (es. {"timestamp":-1})
     *         schema:
     *           type: string
     *       - name: filters
     *         in: query
     *         description: JSON string per i filtri
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Elenco sessioni.
     */
    @Get('/sessions')
    async getSessions(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const sortStr = req.query.sort as string;
            const filtersStr = req.query.filters as string;

            let sortFields: Record<string, any> = { timestamp: -1 };
            let filters: any = {};

            if (sortStr) {
                try {
                    sortFields = JSON.parse(sortStr);
                } catch (e) {
                    this.logger.warn(`[CowrieController] Failed to parse sort query: ${sortStr}`);
                }
            }

            if (filtersStr) {
                try {
                    filters = JSON.parse(filtersStr);
                } catch (e) {
                    this.logger.warn(`[CowrieController] Failed to parse filters query: ${filtersStr}`);
                }
            }

            const { sessions, totalCount } = await this.cowrieService.getSessions(page, pageSize, sortFields, filters);

            res.status(200).json({
                sessions,
                total: totalCount,
                page,
                pageSize
            });
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in getSessions: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.fetchError', locale) });
        }
    }

    /**
     * @openapi
     * /cowrie/search:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ricerca avanzata nelle sessioni Cowrie
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
     *               sortFields:
     *                 type: object
     *     responses:
     *       200:
     *         description: Risultati ricerca.
     */
    @Post('/search')
    async searchSessions(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const pageSize = parseInt(req.body.pageSize as string) || 20;
            const sortFields = req.body.sortFields || { timestamp: -1 };
            const filters = req.body.filters || {};

            const { sessions, totalCount } = await this.cowrieService.getSessions(page, pageSize, sortFields, filters);

            res.status(200).json({
                sessions,
                total: totalCount,
                page,
                pageSize
            });
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in searchSessions: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.searchError', locale) });
        }
    }

    /**
     * @openapi
     * /cowrie/sessions/{id}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene i dettagli completi di una sessione Cowrie
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dettagli sessione.
     */
    @Get('/sessions/:id')
    async getSessionDetails(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const session = await this.cowrieService.getSessionDetails(id);
            if (!session) {
                const locale = this.getLocale(req);
                res.status(404).json({ error: this.i18n.t('errors.system.notFound', locale) });
                return;
            }
            res.status(200).json(session);
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in getSessionDetails: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.fetchError', locale) });
        }
    }

    /**
     * @openapi
     * /cowrie/sessions/{id}/events:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene la timeline degli eventi di una sessione specifica
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Timeline eventi.
     */
    @Get('/sessions/:id/events')
    async getSessionEvents(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const events = await this.cowrieService.getSessionEvents(id);
            res.status(200).json(events);
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in getSessionEvents: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.fetchError', locale) });
        }
    }
}
