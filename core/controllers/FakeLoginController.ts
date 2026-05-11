import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import path from 'path';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { Controller, Get, Post, All, Use } from '../registry/decorators';
import { getComponent } from '../di/container';
import { RateLimitMiddleware } from '../rateLimitMiddleware';

const rateLimit = () => getComponent<RateLimitMiddleware>(Tokens.RATE_LIMIT_MIDDLEWARE_TOKEN);

@singleton()
@Controller('/')
export class FakeLoginController {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private logger: Logger
    ) {}

    /**
     * @openapi
     * /:
     *   get:
     *     tags: [Honeypot Traps]
     *     summary: Mostra la pagina di finto login (esca)
     *     description: Restituisce l'HTML della pagina di login utilizzata per catturare le credenziali degli attaccanti.
     *     responses:
     *       200:
     *         description: Pagina HTML caricata con successo.
     */
    @Get('/', [(req: any, res: any, next: any) => rateLimit().criticalEndpointsLimiter()(req, res, next)])
    showFakeLogin(_req: Request, res: Response): void {
        this.logger.info('[FakeLoginController] External request intercepted: showing fake login page');
        res.status(200).sendFile(path.join(__dirname, '..', 'public', 'fake_login.html'));
    }

    /**
     * @openapi
     * /login:
     *   post:
     *     tags: [Honeypot Traps]
     *     summary: Gestisce il tentativo di login sulla trappola
     *     description: Analizza le credenziali fornite, logga l'attacco e reindirizza l'attaccante.
     *     requestBody:
     *       required: true
     *       content:
     *         application/x-www-form-urlencoded:
     *           schema:
     *             type: object
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       302:
     *         description: Reindirizzamento dell'attaccante.
     */
    @Post('/login', [(req: any, res: any, next: any) => rateLimit().criticalEndpointsLimiter()(req, res, next)])
    handleFakeLogin(_req: Request, res: Response): void {
        this.logger.info('[FakeLoginController] Fake login attempt intercepted');
        // Simulate a delay for realism
        setTimeout(() => {
            res.status(401).sendFile(path.join(__dirname, '..', 'public', 'fake_esito_login.html'));
        }, Math.random() * 2000 + 1000);
    }

    /**
     * @openapi
     * /common-endpoints:
     *   all:
     *     tags: [Honeypot Traps]
     *     summary: Endpoint comuni configurabili (es. /wp-admin, /admin)
     *     description: Gestisce tutte le richieste verso endpoint comuni definiti in configurazione come trappole.
     *     responses:
     *       200:
     *         description: Risposta della trappola.
     */
    handleTrap(req: Request, res: Response): void {
        this.logger.info(`[FakeLoginController] Trap endpoint hit: ${req.originalUrl}`);
        res.status(418).send('Ai ai ai... siamo nei guai... ta ta dan!');
    }

    @Use('*')
    handleNotFound(req: Request, res: Response): void {
        this.logger.info(`[FakeLoginController] Not found (redirected to 418): ${req.originalUrl}`);
        res.status(418).send('Non mettere le mani nella marmellata');
    }

    @Use()
    handleError(_error: any, _req: Request, res: Response, _next: any): void {
        this.logger.error('[FakeLoginController] Internal Server Error:', _error);
        res.status(500).send('Errore interno del server');
    }
}

import { ConfigDefaults } from '../utils/ConfigUtils';

// Applicazione dinamica dei decoratori per i COMMON_ENDPOINTS
const commonEndpoints = (process.env.COMMON_ENDPOINTS || ConfigDefaults.COMMON_ENDPOINTS)
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

commonEndpoints.forEach(endpoint => {
    All(endpoint, [(req: any, res: any, next: any) => rateLimit().trapEndpointsLimiter()(req, res, next)])(FakeLoginController.prototype, 'handleTrap');
});
