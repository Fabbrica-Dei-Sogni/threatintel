import express from 'express';
import dotenv from 'dotenv';
import { uriDigitalAuth } from '../config';

dotenv.config();

export default (logger: any, threatLoggerService: any, ipDetailsService: any) => {
    const router = express.Router();

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
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero statistiche' });
        }
    });

    router.get('/api/logs', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di recupero logs');

        try {
            const { page = 1, pageSize = 20, ip, suspicious } = req.query as any;
            const filters: any = {};
            if (ip) filters['request.ip'] = ip;
            if (suspicious === 'true') filters['fingerprint.suspicious'] = true;
            else if (suspicious === 'false') filters['fingerprint.suspicious'] = false;

            const logs = await threatLoggerService.getLogs({ page, pageSize, filters });
            const total = await threatLoggerService.countLogs(filters);

            res.json({ logs, total, page: Number(page), pageSize: Number(pageSize) });
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero log' });
        }
    });

    router.post('/api/search', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di ricerca logs');

        try {
            const { page = 1, pageSize = 20, filters = {}, sortFields = {} } = req.body;

            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));

            const logs = await threatLoggerService.getLogs({ page: pageNum, pageSize: pageSizeNum, filters, sortFields });
            const total = await threatLoggerService.countLogs(filters);

            res.json({ logs, total, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            logger.error('Errore recupero log:', err);
            res.status(err.status || 500).json({ error: 'Errore recupero log' });
        }
    });

    router.post('/api/attack/search', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di ricerca attacchi');

        try {
            const { page = 1, pageSize = 20, filters = {}, minLogsForAttack = 10, timeConfig = {}, sortFields = {} } = req.body;

            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));
            const minLogsForAttackNum = Math.max(1, parseInt(minLogsForAttack));

            const data = await threatLoggerService.getAttacks({ page: pageNum, pageSize: pageSizeNum, filters, minLogsForAttack: minLogsForAttackNum, timeConfig, sortFields });

            res.json({ attacks: data.items, total: data.totalCount, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            logger.error('Errore recupero attacchi:', err);
            res.status(err.status || 500).json({ error: 'Errore recupero attacchi' });
        }
    });

    router.get('/api/logs/:id', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di recupero log ' + req.params.id);
        try {
            const log = await threatLoggerService.getLogById(req.params.id);
            if (!log) return res.status(404).json({ error: 'Log non trovato' });
            res.json(log);
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero dettaglio log' });
        }
    });

    router.get('/api/reputationscore/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Richiesta di recupero reputation score ' + req.params.ip);
        try {
            const reputationData = await ipDetailsService.enrichWithAbuse(req.params.ip);
            if (!reputationData) return res.status(404).json({ error: 'Reputation score non trovato' });
            res.json(reputationData);
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero reputation score ' + JSON.stringify(err) });
        }
    });

    router.post('/api/enrichreports/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Recupero e salvataggio dei reports per ' + req.params.ip);
        try {
            let maxAgeInDays = 2;
            let perPage = 100;

            const reportsData = await ipDetailsService.getAndSaveReportsAbuseIpDb(req.params.ip, maxAgeInDays, perPage);
            if (!reportsData) return res.status(404).json({ error: 'Reports non trovati' });
            res.json(reportsData);
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero reputation score ' + JSON.stringify(err) });
        }
    });

    router.get('/api/ipdetail/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Recupero di un detail per IP ' + req.params.ip);
        let ip = req.params.ip;

        try {
            const ipDetailsId = await ipDetailsService.getIpDetails(ip);
            if (!ipDetailsId) return res.status(404).json({ error: 'Ip detail non trovato' });
            res.json(ipDetailsId);
        } catch (err: any) {
            logger.error('Errore durante recupero IP:', err);
            res.status(err.status || 500).json({ error: 'Errore durante recupero IP' });
        }
    });

    router.post('/api/enrich/:ip', /*verifyToken,*/ async (req, res) => {
        logger.info('Arricchimento detail per IP ' + req.params.ip);
        let ip = req.params.ip;

        try {
            const ipDetailsId = await ipDetailsService.findOrCreate(ip, true);
            await threatLoggerService.assignIpDetailsToLogs(ip, ipDetailsId);

            res.json({ message: 'Arricchimento IP completato per ' + ip });
        } catch (err: any) {
            logger.error('Errore durante arricchimento IP:', err);
            res.status(err.status || 500).json({ error: 'Errore durante arricchimento IP' });
        }
    });

    router.post('/api/enrich', /*verifyToken,*/ async (req, res) => {
        logger.info('Avvio arricchimento batch IP unici nei log');
        try {
            const uniqueIps = await threatLoggerService.getDistinctIPs();
            const results: any[] = [];
            for (const ip of uniqueIps) {
                const ipDetailsId = await ipDetailsService.findOrCreate(ip);
                await threatLoggerService.assignIpDetailsToLogs(ip, ipDetailsId);
                results.push({ ip, ipDetailsId });
            }

            res.json({ message: 'Arricchimento IP completato', processed: results.length, details: results });
        } catch (err: any) {
            logger.error('Errore durante arricchimento IP:', err);
            res.status(err.status || 500).json({ error: 'Errore durante arricchimento IP' });
        }
    });

    router.post('/api/reanalyze-all', /*verifyToken,*/ async (req, res) => {
        logger.info('Avvio rianalisi di tutti i log esistenti');

        try {
            const { batchSize = 100, updateDatabase = true } = req.body;
            const result = await threatLoggerService.analyzeLogs({ batchSize, updateDatabase });
            res.json(result);
        } catch (err: any) {
            logger.error('Errore durante rianalisi di tutti i log:', err);
            res.status(err.status || 500).json({ error: 'Errore durante rianalisi di tutti i log', details: err.message });
        }
    });

    router.get('/api/analyze-preview', /*verifyToken,*/ async (req, res) => {
        logger.info('Avvio preview rianalisi (dry-run)');

        try {
            const { limit = 1000 } = req.query as any;
            const result = await threatLoggerService.dryRunAnalyzeLogs({ limit });
            res.json(result);
        } catch (err: any) {
            logger.error('Errore durante preview rianalisi:', err);
            res.status(err.status || 500).json({ error: 'Errore durante preview rianalisi', details: err.message });
        }
    });

    return router;
};
