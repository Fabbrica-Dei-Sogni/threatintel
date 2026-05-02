/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { AssistantService } from '../services/assistant/AssistantService';
import { LOGGER_TOKEN, ASSISTANT_SERVICE_TOKEN, I18N_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { I18nService } from '../services/I18nService';
import { Controller, Post } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = getComponent(AuthMiddleware);

@singleton()
@Controller('/api/assistant')
export class AssistantController {
    constructor(
        @inject(ASSISTANT_SERVICE_TOKEN) private assistant: AssistantService,
        @inject(LOGGER_TOKEN) private logger: Logger,
        @inject(I18N_TOKEN) private i18n: I18nService
    ) { }

    /**
     * @openapi
     * /api/assistant/search:
     *   post:
     *     summary: Esegue una ricerca semantica RAG
     *     tags: [Assistant]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *               limit:
     *                 type: number
     *               type:
     *                 type: string
     *                 enum: [threat_log, ip_details, campaign_summary]
     */
    @Post('/search', [auth.isAuthenticated()])
    async search(req: Request, res: Response): Promise<void> {
        const { query, limit, scoreThreshold, type } = req.body;

        try {
            if (!query) {
                res.status(400).json({ error: this.i18n.t('errors.rag.missingQuery') });
                return;
            }

            const results = await this.assistant.search(query, { limit, scoreThreshold, type });

            res.json({
                query,
                count: results.length,
                results
            });
        } catch (err: any) {
            this.logger.error('[AssistantController] RAG Search error:', err);
            res.status(503).json({ error: err.message });
        }
    }

    /**
     * @openapi
     * /api/assistant/ask:
     *   post:
     *     summary: Risponde a una domanda basandosi sul contesto RAG
     *     tags: [Assistant]
     */
    @Post('/ask', [auth.isAuthenticated()])
    async ask(req: Request, res: Response): Promise<void> {
        const { question } = req.body;

        try {
            if (!question) {
                res.status(400).json({ error: this.i18n.t('errors.rag.missingQuestion') });
                return;
            }

            const response = await this.assistant.ask(question);
            res.json(response);
        } catch (err: any) {
            this.logger.error('[AssistantController] RAG Ask error:', err);
            res.status(503).json({ error: err.message });
        }
    }

    /**
     * @openapi
     * /api/assistant/resolve:
     *   post:
     *     summary: Risolve un riferimento sorgente (SourceRef) in dati tecnici completi
     *     tags: [Assistant]
     */
    @Post('/resolve', [auth.isAuthenticated()])
    async resolve(req: Request, res: Response): Promise<void> {
        const { sourceRef } = req.body;

        try {
            if (!sourceRef) {
                res.status(400).json({ error: this.i18n.t('errors.rag.missingSourceRef') });
                return;
            }

            const data = await this.assistant.resolveSource(sourceRef);
            res.json({
                sourceRef,
                data
            });
        } catch (err: any) {
            this.logger.error('[AssistantController] Source Resolution error:', err);
            res.status(500).json({ error: this.i18n.t('errors.rag.resolveError') });
        }
    }
}
