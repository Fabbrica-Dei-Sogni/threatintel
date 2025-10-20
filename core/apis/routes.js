const express = require('express');
const router = express.Router();
require('dotenv').config();
const path = require('path');


// Import del rate limiting middleware
const {
    ddosProtectionLimiter,
    criticalEndpointsLimiter,
    trapEndpointsLimiter,
    applicationLimiter,
    violationTracker
} = require('../rateLimitMiddleware');

module.exports = (logger) => {

    // Applicazione del middleware di tracking violazioni per tutte le route
    router.use(violationTracker(logger));

    // Applicazione del rate limiting generale (DDoS protection)
    router.use(ddosProtectionLimiter(logger));

    // Applicazione del rate limiting generale applicazione
    router.use(applicationLimiter(logger));
    
    // Landing page "honeypot-like"
    router.get('/', criticalEndpointsLimiter(logger), (req, res) => {
        logger.info('Richiesta esterna intercettata: visualizzazione pagina di login finta');
        res.status(200).sendFile(path.join(__dirname, '..', 'public', 'fake_login.html'));
    });

    // Pagina finta di esito login
    router.post('/login', criticalEndpointsLimiter(logger), (req, res) => {
        logger.info('Visualizzazione fake esito login');
        setTimeout(() => {
            res.status(401).sendFile(path.join(__dirname, '..', 'public', 'fake_esito_login.html'));
        }, Math.random() * 2000 + 1000); // 1-3 secondi

        
    });

    // Altri endpoint "comuni" che potrebbero essere scansionati
    const commonEndpoints = (process.env.COMMON_ENDPOINTS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

    if (commonEndpoints.length) {
        logger.info(`[routes] COMMON_ENDPOINTS caricati: ${commonEndpoints.join(', ')}`);
    }
    
    commonEndpoints.forEach(endpoint => {
        router.all(endpoint, trapEndpointsLimiter(logger), (req, res) => {
            res.status(418).send('Ai ai ai... siamo nei guai... ta ta dan!');
        });
    });



    // 404 handler
    router.use('*', (req, res) => {
        logger.info('Richiesta esterna rediretta a un handler 404');
        res.status(418).send('Non mettere le mani nella marmellata');
    });

    // Error handler
    router.use((error, req, res, next) => {
        logger.error('Errore server:', error);
        res.status(500).send('Errore interno del server');
    });

    return router;
};
