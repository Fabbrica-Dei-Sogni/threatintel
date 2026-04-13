import express from 'express';
import { ReportController } from '../controllers/ReportController';

export default (reportController: ReportController) => {
    const router = express.Router();

    /**
     * @openapi
     * /reports/dettaglio:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Genera un report dettagliato per un attacco (IP o SessionID)
     *     responses:
     *       200:
     *         description: Report generato.
     */
    router.get('/api/reports/dettaglio', (req, res) => reportController.generateDetailReport(req, res));

    /**
     * @openapi
     * /reports/custom:
     *   post:
     *     tags: [Dossier & Forensics]
     *     summary: Genera un report personalizzato basato su criteri specifici
     *     responses:
     *       200:
     *         description: Report custom generato.
     */
    router.post('/api/reports/custom', (req, res) => reportController.generateCustomReport(req, res));

    return router;
};
