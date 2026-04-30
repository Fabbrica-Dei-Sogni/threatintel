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
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class AuthController {
    constructor(
        @inject(AuthService) private authService: AuthService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

    public async login(req: Request, res: Response): Promise<void> {
        try {
            const data = await this.authService.login(req.body);
            res.status(200).json(data);
        } catch (error: any) {
            this.logger.warn(`[AuthController] Login fallito: ${error.message}`);
            res.status(error.status || 401).json({ message: error.message });
        }
    }

    public async getAuthMode(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            allowAnonymous: process.env.ALLOW_ANONYMOUS === 'true',
            anonymousRole: process.env.ANONYMOUS_ROLE || 'viewer'
        });
    }

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
