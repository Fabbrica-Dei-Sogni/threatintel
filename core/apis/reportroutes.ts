import express from 'express';
import { ReportController } from '../controllers/ReportController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

export default (reportController: ReportController, authMiddleware: AuthMiddleware) => {
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
    router.get('/api/reports/dettaglio', authMiddleware.isIdentified(), (req, res) => reportController.generateDetailReport(req, res));

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
    router.post('/api/reports/custom', authMiddleware.isIdentified(), (req, res) => reportController.generateCustomReport(req, res));

    return router;
};
