/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { AuthService } from '../services/AuthService';
import { AppConfigProvider } from '../services/AppConfigProvider';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { Controller, Get, Post } from '../registry/decorators';

@singleton()
@Controller('/api/auth')
export class AuthController {
    constructor(
        @inject(Tokens.AUTH_SERVICE_TOKEN) private readonly authService: AuthService,
        @inject(Tokens.CONFIG_PROVIDER_TOKEN) private readonly configProvider: AppConfigProvider,
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) {}

    /**
     * @openapi
     * /auth/login:
     *   post:
     *     tags: [Auth Proxy]
     *     summary: Effettua il login verso l'Identity Provider
     *     description: Invia le credenziali al Digital-Auth-TS e restituisce un JWT token.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [username, password]
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login riuscito, token restituito.
     *       401:
     *         description: Credenziali non valide o accesso negato.
     */
    @Post('/login')
    public async login(req: Request, res: Response): Promise<void> {
        try {
            const data = await this.authService.login(req.body);
            res.status(200).json(data);
        } catch (error: any) {
            this.logger.warn(`[AuthController] Login fallito: ${error.message}`);
            res.status(error.status || 401).json({ message: error.message });
        }
    }

    /**
     * @openapi
     * /auth/mode:
     *   get:
     *     tags: [Auth Proxy]
     *     summary: Ottiene la modalità di autenticazione corrente
     *     responses:
     *       200:
     *         description: Modalità di autenticazione (proxy o locale).
     */
    @Get('/mode')
    public async getAuthMode(_req: Request, res: Response): Promise<void> {
        res.status(200).json({
            allowAnonymous: this.configProvider.allowAnonymous,
            anonymousRole: this.configProvider.anonymousRole
        });
    }

    /**
     * @openapi
     * /auth/register:
     *   post:
     *     tags: [Auth Proxy]
     *     summary: Registra un nuovo utente sull'Identity Provider
     *     description: Crea un nuovo account associato a questa istanza di ThreatIntel.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [username, password, email]
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *               email:
     *                 type: string
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *     responses:
     *       201:
     *         description: Registrazione completata, email di attivazione inviata.
     *       400:
     *         description: Dati non validi o utente già esistente.
     */
    @Post('/register')
    public async register(req: Request, res: Response): Promise<void> {
        try {
            const data = await this.authService.register(req.body);
            res.status(201).json(data);
        } catch (error: any) {
            this.logger.warn(`[AuthController] Register fallito: ${error.message}`);
            res.status(error.status || 400).json({ message: error.message });
        }
    }
}
