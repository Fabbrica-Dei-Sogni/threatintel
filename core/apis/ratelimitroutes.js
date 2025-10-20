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
require('dotenv').config();
//XXX: predisposti i metodi di verifica token per ciascun api coinvolta
const { uriDigitalAuth } = require('../config');

module.exports = (logger, rateLimitService) => {

    
    router.post('/api/ratelimit/search', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di ricerca ratelimits');

        try {
            // Estrai parametri dalla richiesta JSON
            const {
                page = 1,
                pageSize = 20,
                filters = {}
            } = req.body;

            // CONVALIDA : page/pageSize numerici e positivi
            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));

            // Recupera i log con i filtri forniti per ThreatLog (es. {"request.ip":"1.2.3.4","fingerprint.suspicious":true})
            const bobjs = await rateLimitService.getEventsByIp({ page: pageNum, pageSize: pageSizeNum, filters });
            const total = await rateLimitService.countEventsByIp(filters);

            res.json({
                bobjs,
                total,
                page: pageNum,
                pageSize: pageSizeNum
            });
        } catch (err) {
            logger.error('Errore recupero ratelimits:', err);
            res.status(500).json({ error: 'Errore recupero ratelimits' });
        }
    }); 
    
    return router;
};