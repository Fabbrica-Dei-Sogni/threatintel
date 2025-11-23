import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import {
    ddosProtectionLimiter,
    criticalEndpointsLimiter,
    trapEndpointsLimiter,
    applicationLimiter,
    violationTracker
} from '../rateLimitMiddleware';

dotenv.config();

export default (logger: any) => {
    const router = express.Router();

    router.use(violationTracker(logger));
    router.use(ddosProtectionLimiter(logger));
    router.use(applicationLimiter(logger));

    router.get('/', criticalEndpointsLimiter(logger), (req, res) => {
        logger.info('Richiesta esterna intercettata: visualizzazione pagina di login finta');
        res.status(200).sendFile(path.join(__dirname, '..', 'public', 'fake_login.html'));
    });

    router.post('/login', criticalEndpointsLimiter(logger), (req, res) => {
        logger.info('Visualizzazione fake esito login');
        setTimeout(() => {
            res.status(401).sendFile(path.join(__dirname, '..', 'public', 'fake_esito_login.html'));
        }, Math.random() * 2000 + 1000);
    });

    const commonEndpoints = (process.env.COMMON_ENDPOINTS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

    if (commonEndpoints.length) logger.info(`[routes] COMMON_ENDPOINTS caricati: ${commonEndpoints.join(', ')}`);

    commonEndpoints.forEach(endpoint => {
        router.all(endpoint, trapEndpointsLimiter(logger), (req, res) => {
            res.status(418).send('Ai ai ai... siamo nei guai... ta ta dan!');
        });
    });

    router.use('*', (req, res) => {
        logger.info('Richiesta esterna rediretta a un handler 404');
        res.status(418).send('Non mettere le mani nella marmellata');
    });

    router.use((error: any, req: any, res: any, next: any) => {
        logger.error('Errore server:', error);
        res.status(500).send('Errore interno del server');
    });

    return router;
};
