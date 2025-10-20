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

module.exports = (logger, threatLoggerService, ipDetailsService) => {

    router.get('/api/stats', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di recupero statistiche sui dati');
        try {
            const stats = await threatLoggerService.getStats('24h');
            const topThreats = await threatLoggerService.getTopThreats(10);

            res.json({
                stats: stats,
                topThreats: topThreats,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            res.status(err.status).json({ error: 'Errore recupero statistiche' });
        }
    });

    // Lista log con paginazione e filtro by ip/sospetti
    router.get('/api/logs', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di recupero logs');

        try {
            const { page = 1, pageSize = 20, ip, suspicious } = req.query;
            const filters = {};
            if (ip) filters['request.ip'] = ip;
            if (suspicious === 'true') filters['fingerprint.suspicious'] = true;
            else if (suspicious === 'false') filters['fingerprint.suspicious'] = false;

            const logs = await threatLoggerService.getLogs({ page, pageSize, filters });
            const total = await threatLoggerService.countLogs(filters);

            res.json({ logs, total, page: Number(page), pageSize: Number(pageSize) });
        } catch (err) {
            res.status(err.status).json({ error: 'Errore recupero log' });
        }
    });

    router.post('/api/search', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di ricerca logs');

        try {
            // Estrai parametri dalla richiesta JSON
            const {
                page = 1,
                pageSize = 20,
                filters = {},
                sortFields = {}
            } = req.body;

            // CONVALIDA : page/pageSize numerici e positivi
            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));

            // Recupera i log con i filtri forniti per ThreatLog (es. {"request.ip":"1.2.3.4","fingerprint.suspicious":true})
            const logs = await threatLoggerService.getLogs({ page: pageNum, pageSize: pageSizeNum, filters, sortFields });
            const total = await threatLoggerService.countLogs(filters);

            res.json({
                logs,
                total,
                page: pageNum,
                pageSize: pageSizeNum
            });
        } catch (err) {
            logger.error('Errore recupero log:', err);
            res.status(err.status).json({ error: 'Errore recupero log' });
        }
    });

    router.post('/api/attack/search', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di ricerca attacchi');

        try {
            // Estrai parametri dalla richiesta JSON
            const {
                page = 1,
                pageSize = 20,
                filters = {},
                minLogsForAttack = 10,
                timeConfig = {
                },
                sortFields = {}
            } = req.body;

            // CONVALIDA : page/pageSize numerici e positivi
            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));
            const minLogsForAttackNum = Math.max(1, parseInt(minLogsForAttack));


            // Recupera i log con i filtri forniti per ThreatLog (es. {"request.ip":"1.2.3.4","fingerprint.suspicious":true})
            const data = await threatLoggerService.getAttacks({ page: pageNum, pageSize: pageSizeNum, filters, minLogsForAttack: minLogsForAttackNum, timeConfig, sortFields });

            res.json({
                attacks: data.items,
                total: data.totalCount,
                page: pageNum,
                pageSize: pageSizeNum
            });
        } catch (err) {
            logger.error('Errore recupero attacchi:', err);
            res.status(err.status).json({ error: 'Errore recupero attacchi' });
        }
    });

    // Dettaglio di un log puntuale
    router.get('/api/logs/:id', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di recupero log ' + req.params.id);
        try {
            const log = await threatLoggerService.getLogById(req.params.id);
            if (!log) return res.status(404).json({ error: 'Log non trovato' });
            res.json(log);
        } catch (err) {
            res.status(err.status).json({ error: 'Errore recupero dettaglio log' });
        }
    });

    router.get('/api/reputationscore/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di recupero reputation score ' + req.params.ip);
        try {
            const reputationData = await ipDetailsService.enrichWithAbuse(req.params.ip);
            if (!reputationData) return res.status(404).json({ error: 'Reputation score non trovato' });
            res.json(reputationData);
        } catch (err) {
            res.status(err.status).json({ error: 'Errore recupero reputation score ' + JSON.stringify(err) });
        }
    });

    router.post('/api/enrichreports/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Recupero e salvataggio dei reports per ' + req.params.ip);

        try {

            let maxAgeInDays = 2; //recupero reports dell'ultimo giorno
            let perPage = 100;

            const reportsData = await ipDetailsService.getAndSaveReportsAbuseIpDb(req.params.ip, maxAgeInDays, perPage);
            if (!reportsData) return res.status(404).json({ error: 'Reports non trovati' });
            res.json(reportsData);

        } catch (err) {
            res.status(err.status).json({ error: 'Errore recupero reputation score ' + JSON.stringify(err) });
        }

    });

    router.get('/api/ipdetail/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Recupero di un detail per IP ' + req.params.ip);
        let ip = req.params.ip;

        try {
            // Trova o crea il documento IpDetails, esegue enrichment solo se non esiste
            const ipDetailsId = await ipDetailsService.getIpDetails(ip);
            if (!ipDetailsId) return res.status(404).json({ error: 'Ip detail non trovato' });
            res.json(ipDetailsId);
        } catch (err) {
            logger.error('Errore durante recupero IP:', err);
            res.status(err.status).json({ error: 'Errore durante recupero IP' });
        }
    });

    // POST /api/enrich - Arricchisce e collega dettagli per uno specifico IP
    router.post('/api/enrich/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Arricchimento detail per IP ' + req.params.ip);
        let ip = req.params.ip;

        try {
            // Trova o crea il documento IpDetails, esegue enrichment solo se non esiste
            const ipDetailsId = await ipDetailsService.findOrCreate(ip, true);

            // Aggiorna tutti i log associati a quell'IP con il nuovo riferimento (se non già presente)
            await threatLoggerService.assignIpDetailsToLogs(ip, ipDetailsId);

            res.json({
                message: 'Arricchimento IP completato per ' + ip
            });
        } catch (err) {
            logger.error('Errore durante arricchimento IP:', err);
            res.status(err.status).json({ error: 'Errore durante arricchimento IP' });
        }
    });

    // POST /api/enrich - Arricchisce e collega dettagli IP unici dei log
    router.post('/api/enrich', /*verifyToken,*/ async (req, res) => {
        logger.info('Avvio arricchimento batch IP unici nei log');
        try {
            // 1. Recupera tutti gli IP unici dai log
            const uniqueIps = await threatLoggerService.getDistinctIPs();

            // 2. Per ognuno trova/crea i dettagli e aggiorna i log
            const results = [];
            for (const ip of uniqueIps) {
                // Trova o crea il documento IpDetails, esegue enrichment solo se non esiste
                const ipDetailsId = await ipDetailsService.findOrCreate(ip);

                // Aggiorna tutti i log associati a quell'IP con il nuovo riferimento (se non già presente)
                await threatLoggerService.assignIpDetailsToLogs(ip, ipDetailsId);

                results.push({ ip, ipDetailsId });
            }

            res.json({
                message: 'Arricchimento IP completato',
                processed: results.length,
                details: results
            });
        } catch (err) {
            logger.error('Errore durante arricchimento IP:', err);
            res.status(err.status).json({ error: 'Errore durante arricchimento IP' });
        }
    });

    // Endpoint REST per rianalizzare tutti i log esistenti
    router.post('/api/reanalyze-all', /*verifyToken,*/ async (req, res) => {
        logger.info('Avvio rianalisi di tutti i log esistenti');

        try {

            const { batchSize = 100, updateDatabase = true } = req.body;

            const result = await threatLoggerService.analyzeLogs({ batchSize, updateDatabase });

            res.json(result);

        } catch (err) {
            logger.error('Errore durante rianalisi di tutti i log:', err);
            res.status(err.status).json({
                error: 'Errore durante rianalisi di tutti i log',
                details: err.message
            });
        }
    });

    // Endpoint per dry-run (solo verifica senza aggiornare)
    router.get('/api/analyze-preview', /*verifyToken,*/ async (req, res) => {
        logger.info('Avvio preview rianalisi (dry-run)');

        try {
            const { limit = 1000 } = req.query;

            const result = await threatLoggerService.dryRunAnalyzeLogs({ limit });

            res.json(result);


        } catch (err) {
            logger.error('Errore durante preview rianalisi:', err);
            res.status(err.status).json({
                error: 'Errore durante preview rianalisi',
                details: err.message
            });
        }
    });

    return router;
};