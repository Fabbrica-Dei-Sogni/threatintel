import express from 'express';
import { ThreatController } from '../controllers/ThreatController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

export default (threatController: ThreatController, authMiddleware: AuthMiddleware) => {
    const router = express.Router();

    /**
     * @openapi
     * /stats:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene le statistiche generali delle minacce
     *     responses:
     *       200:
     *         description: Statistiche recuperate con successo.
     */
    router.get('/api/stats', (req, res) => threatController.getStats(req, res));

    /**
     * @openapi
     * /logs:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Recupera la lista dei log delle minacce
     *     responses:
     *       200:
     *         description: Elenco log restituito.
     */
    router.get('/api/logs', (req, res) => threatController.getLogs(req, res));

    /**
     * @openapi
     * /search:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ricerca avanzata nei log
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *     responses:
     *       200:
     *         description: Risultati della ricerca.
     */
    router.post('/api/search', (req, res) => threatController.searchLogs(req, res));

    /**
     * @openapi
     * /attack/search:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ricerca attacchi raggruppati
     *     responses:
     *       200:
     *         description: Elenco attacchi aggregati.
     */
    router.post('/api/attack/search', (req, res) => threatController.searchAttacks(req, res));

    /**
     * @openapi
     * /attack/details:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli specifici di un attacco
     *     responses:
     *       200:
     *         description: Dettagli dell'attacco.
     */
    router.post('/api/attack/details', (req, res) => threatController.getAttackDetails(req, res));

    /**
     * @openapi
     * /logs/{id}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Recupera un singolo log tramite ID
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dettaglio del log.
     */
    router.get('/api/logs/:id', (req, res) => threatController.getLogById(req, res));

    /**
     * @openapi
     * /reputationscore/{ip}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Calcola il Reputation Score di un IP
     *     parameters:
     *       - name: ip
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Score calcolato.
     */
    router.get('/api/reputationscore/:ip', (req, res) => threatController.getReputationScore(req, res));

    /**
     * @openapi
     * /enrichreports/{ip}:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Arricchisce i report per un IP specifico
     *     responses:
     *       200:
     *         description: Dati arricchiti.
     */
    router.post('/api/enrichreports/:ip', (req, res) => threatController.enrichReports(req, res));

    /**
     * @openapi
     * /ipdetail/{ip}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli geolocalizzati e tecnici di un IP
     *     responses:
     *       200:
     *         description: Dettagli IP.
     */
    router.get('/api/ipdetail/:ip', (req, res) => threatController.getIpDetail(req, res));

    /**
     * @openapi
     * /enrich/{ip}:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Esegue l'enrichment manuale di un IP
     *     responses:
     *       200:
     *         description: Enrichment completato.
     */
    router.post('/api/enrich/:ip', (req, res) => threatController.enrichIp(req, res));

    /**
     * @openapi
     * /enrich:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Esegue l'enrichment massivo (batch)
     *     responses:
     *       200:
     *         description: Risultati batch.
     */
    router.post('/api/enrich', (req, res) => threatController.batchEnrich(req, res));

    /**
     * @openapi
     * /reanalyze-all:
     *   post:
     *     tags: [System & Security]
     *     summary: Ri-analizza tutti i log presenti nel DB (Admin Only)
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Processo avviato.
     */
    router.post('/api/reanalyze-all', authMiddleware.hasRole('admin'), (req, res) => threatController.reanalyzeAll(req, res));

    /**
     * @openapi
     * /analyze-preview:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Anteprima dell'analisi dei log
     *     responses:
     *       200:
     *         description: Anteprima generata.
     */
    router.get('/api/analyze-preview', (req, res) => threatController.analyzePreview(req, res));
    
    /**
     * @openapi
     * /attack/distributed-discovery:
     *   get:
     *     tags: [Forensic Analysis]
     *     summary: Scopre pattern di attacco (hash) condivisi da più IP
     *     responses:
     *       200:
     *         description: Elenco pattern distribuiti trovati.
     */
    router.get('/api/attack/distributed-discovery', (req, res) => threatController.getDistributedCampaigns(req, res));

    return router;
};
