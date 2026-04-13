import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { RateLimitMiddleware } from '../rateLimitMiddleware';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { isValidIp } from '../utils/ipValidator';

@singleton()
export class ManageLimitController {
    constructor(
        @inject(LOGGER_TOKEN) private logger: Logger,
        private rateLimitMiddleware: RateLimitMiddleware
    ) { }

    // POST /api/blacklist-ip
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
}
