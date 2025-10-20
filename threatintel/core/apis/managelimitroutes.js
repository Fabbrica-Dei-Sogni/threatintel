/*

Dati aggregati (statistiche totali, top threat, trend temporali)

Dati puntuali (analisi singole richieste/dettagli log)

Filtri dinamici (per IP, data, score, pattern sospetti, etc.)

 */

/*

GET	/api/stats/summary	Statistiche generali (ultime 24h, 7gg)
GET	/api/stats/timeline	Serie temporale richieste/sospette per ora
GET	/api/logs	Lista log, con paginazione e filtri
GET	/api/logs/:id	Dettaglio log puntuale
GET	/api/top	Top IP, country, UA, pattern sospetti, etc.
GET	/api/indicators	Lista indicatori/sospetti più comuni

 */

// API per visualizzare statistiche (protetta)
const express = require('express');
const router = express.Router();
const { manualBlacklistIP } = require('../rateLimitMiddleware'); // 

module.exports = (logger) => {
    // Middleware di autenticazione/authorization va inserito qui prima, per proteggere la rotta

    router.post('/api/blacklist-ip', async (req, res) => {
        const { ip } = req.body;
        if (!ip) {
            return res.status(400).json({ error: 'IP mancante nel corpo della richiesta' });
        }

        try {
            await manualBlacklistIP(ip);
            return res.status(200).json({ message: `IP ${ip} inserito con successo in blacklist.` });
        } catch (error) {
            logger.error(`[BLACKLIST-IP-ERROR] Errore durante inserimento IP ${ip}: ${error.message}`);
            return res.status(500).json({ error: 'Errore interno durante la blacklist dell\'IP' });
        }
    });
    return router;
};