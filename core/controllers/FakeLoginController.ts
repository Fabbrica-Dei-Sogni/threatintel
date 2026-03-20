import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import path from 'path';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class FakeLoginController {
    constructor(
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

    // GET / (fake login page)
    showFakeLogin(req: Request, res: Response): void {
        this.logger.info('[FakeLoginController] External request intercepted: showing fake login page');
        res.status(200).sendFile(path.join(__dirname, '..', 'public', 'fake_login.html'));
    }

    // POST /login (fake login attempt)
    handleFakeLogin(req: Request, res: Response): void {
        this.logger.info('[FakeLoginController] Fake login attempt intercepted');
        // Simulate a delay for realism
        setTimeout(() => {
            res.status(401).sendFile(path.join(__dirname, '..', 'public', 'fake_esito_login.html'));
        }, Math.random() * 2000 + 1000);
    }

    // All trap endpoints (COMMON_ENDPOINTS)
    handleTrap(req: Request, res: Response): void {
        this.logger.info(`[FakeLoginController] Trap endpoint hit: ${req.originalUrl}`);
        res.status(418).send('Ai ai ai... siamo nei guai... ta ta dan!');
    }

    // Catch-all 418
    handleNotFound(req: Request, res: Response): void {
        this.logger.info(`[FakeLoginController] Not found (redirected to 418): ${req.originalUrl}`);
        res.status(418).send('Non mettere le mani nella marmellata');
    }

    // Server error handler
    handleError(error: any, req: Request, res: Response): void {
        this.logger.error('[FakeLoginController] Internal Server Error:', error);
        res.status(500).send('Errore interno del server');
    }
}
