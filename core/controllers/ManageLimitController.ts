import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { manualBlacklistIP } from '../rateLimitMiddleware';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class ManageLimitController {
    constructor(
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

    // POST /api/blacklist-ip
    async blacklistIP(req: Request, res: Response): Promise<void> {
        const { ip } = req.body;
        if (!ip) {
            res.status(400).json({ error: 'IP mancante nel corpo della richiesta' });
            return;
        }

        try {
            await manualBlacklistIP(ip);
            res.status(200).json({ message: `IP ${ip} inserito con successo in blacklist.` });
        } catch (error: any) {
            this.logger.error(`[ManageLimitController] Errore durante inserimento IP ${ip}: ${error.message}`);
            res.status(500).json({ error: 'Errore interno durante la blacklist dell\'IP' });
        }
    }
}
