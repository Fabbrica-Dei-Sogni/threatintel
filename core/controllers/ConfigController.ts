/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { ConfigService } from '../services/ConfigService';
import { SshLogService } from '../services/SshLogService';
import { NginxLogService } from '../services/NginxLogService';
import { PatternAnalysisService } from '../services/PatternAnalysisService';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { Controller, Get, Post, Delete } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = () => getComponent<AuthMiddleware>(Tokens.AUTH_MIDDLEWARE_TOKEN);

@singleton()
@Controller('/api/config')
export class ConfigController {
    constructor(
        @inject(Tokens.CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
        @inject(Tokens.SSH_LOG_SERVICE_TOKEN) private readonly sshLogService: SshLogService,
        @inject(Tokens.NGINX_LOG_SERVICE_TOKEN) private readonly nginxLogService: NginxLogService,
        @inject(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN) private readonly patternAnalysisService: PatternAnalysisService,
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {}

    /**
     * @openapi
     * /config:
     *   get:
     *     tags: [System & Security]
     *     summary: Recupera tutte le configurazioni di sistema
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Elenco configurazioni restituito.
     */
    @Get('/', [(req: any, res: any, next: any) => auth().hasRole('admin')(req, res, next)])
    async getAllConfigs(_req: Request, res: Response): Promise<void> {
        this.logger.info('[ConfigController] Fetching all configurations');
        try {
            const configs = await this.configService.getAllConfigs();
            res.json(configs);
        } catch (err: any) {
            this.logger.error('[ConfigController] Error fetching configurations:', err);
            res.status(500).json({ error: 'Errore recupero configurazioni' });
        }
    }

    /**
     * @openapi
     * /config:
     *   post:
     *     tags: [System & Security]
     *     summary: Salva o aggiorna una configurazione
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               key:
     *                 type: string
     *               value:
     *                 type: string
     *     responses:
     *       200:
     *         description: Configurazione salvata.
     */
    @Post('/', [(req: any, res: any, next: any) => auth().hasRole('admin')(req, res, next)])
    async saveConfig(req: Request, res: Response): Promise<void> {
        const { key, value } = req.body;
        this.logger.info(`[ConfigController] Saving configuration: ${key}`);

        if (!key || value === undefined) {
            res.status(400).json({ error: 'Key e Value sono obbligatori' });
            return;
        }

        try {
            const result = await this.configService.saveConfig(key, value);

            // Reload configurations in dependent services
            await this.sshLogService.loadConfig();
            await this.nginxLogService.start(); // This reloads patterns
            await this.patternAnalysisService.loadConfigFromDB();

            res.json(result);
        } catch (err: any) {
            this.logger.error(`[ConfigController] Error saving configuration ${key}:`, err);
            res.status(500).json({ error: 'Errore salvataggio configurazione' });
        }
    }

    /**
     * @openapi
     * /config/{key}:
     *   delete:
     *     tags: [System & Security]
     *     summary: Elimina una configurazione tramite chiave
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: key
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Configurazione eliminata.
     */
    @Delete('/:key', [(req: any, res: any, next: any) => auth().hasRole('admin')(req, res, next)])
    async deleteConfig(req: Request, res: Response): Promise<void> {
        const key = req.params.key as string;
        this.logger.info(`[ConfigController] Deleting configuration: ${key}`);

        try {
            const deleted = await this.configService.deleteConfig(key);
            if (deleted) {
                res.json({ message: `Configurazione ${key} eliminata con successo` });
            } else {
                res.status(404).json({ error: 'Configurazione non trovata' });
            }
        } catch (err: any) {
            this.logger.error(`[ConfigController] Error deleting configuration ${key}:`, err);
            res.status(500).json({ error: 'Errore eliminazione configurazione' });
        }
    }

    /**
     * @openapi
     * /config/search:
     *   post:
     *     tags: [System & Security]
     *     summary: Ricerca tra le chiavi di configurazione
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *     responses:
     *       200:
     *         description: Risultati della ricerca.
     */
    @Post('/search', [(req: any, res: any, next: any) => auth().hasRole('admin')(req, res, next)])
    async searchConfigs(req: Request, res: Response): Promise<void> {
        const { query } = req.body;
        this.logger.info(`[ConfigController] Searching configurations with query: ${query}`);

        try {
            const results = await this.configService.searchConfigs(query || '');
            res.json(results);
        } catch (err: any) {
            this.logger.error(`[ConfigController] Error searching configurations with query ${query}:`, err);
            res.status(500).json({ error: 'Errore ricerca configurazioni' });
        }
    }
}
