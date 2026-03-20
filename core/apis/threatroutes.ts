import express from 'express';
import { ThreatController } from '../controllers/ThreatController';

export default (threatController: ThreatController) => {
    const router = express.Router();

    router.get('/api/stats', (req, res) => threatController.getStats(req, res));
    router.get('/api/logs', (req, res) => threatController.getLogs(req, res));
    router.post('/api/search', (req, res) => threatController.searchLogs(req, res));
    router.post('/api/attack/search', (req, res) => threatController.searchAttacks(req, res));
    router.get('/api/logs/:id', (req, res) => threatController.getLogById(req, res));
    router.get('/api/reputationscore/:ip', (req, res) => threatController.getReputationScore(req, res));
    router.post('/api/enrichreports/:ip', (req, res) => threatController.enrichReports(req, res));
    router.get('/api/ipdetail/:ip', (req, res) => threatController.getIpDetail(req, res));
    router.post('/api/enrich/:ip', (req, res) => threatController.enrichIp(req, res));
    router.post('/api/enrich', (req, res) => threatController.batchEnrich(req, res));
    router.post('/api/reanalyze-all', (req, res) => threatController.reanalyzeAll(req, res));
    router.get('/api/analyze-preview', (req, res) => threatController.analyzePreview(req, res));

    return router;
};
