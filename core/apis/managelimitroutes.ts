import express from 'express';
import { manualBlacklistIP } from '../rateLimitMiddleware';

export default (logger: any) => {
    const router = express.Router();

    router.post('/api/blacklist-ip', async (req, res) => {
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ error: 'IP mancante nel corpo della richiesta' });

        try {
            await manualBlacklistIP(ip);
            return res.status(200).json({ message: `IP ${ip} inserito con successo in blacklist.` });
        } catch (error: any) {
            logger.error(`[BLACKLIST-IP-ERROR] Errore durante inserimento IP ${ip}: ${error.message}`);
            return res.status(500).json({ error: 'Errore interno durante la blacklist dell\'IP' });
        }
    });

    return router;
};
