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
     *     parameters:
     *       - name: ip
     *         in: query
     *         schema:
     *           type: string
     *       - name: sessionId
     *         in: query
     *         schema:
     *           type: string
     *       - name: type
     *         in: query
     *         schema:
     *           type: string
     *           enum: [attack, telnet, ip]
     *           default: attack
     *       - name: format
     *         in: query
     *         schema:
     *           type: string
     *           enum: [html, pdf]
     *           default: pdf
     *       - name: locale
     *         in: query
     *         schema:
     *           type: string
     *           default: it-IT
     *       - name: style
     *         in: query
     *         schema:
     *           type: string
     *           enum: [classic, hud, telex]
     *           default: classic
     *       - name: ipList
     *         in: query
     *         description: JSON array di IP per report distribuiti
     *         schema:
     *           type: string
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
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               sections:
     *                 type: array
     *                 items:
     *                   type: object
     *               locale:
     *                 type: string
     *                 default: it-IT
     *     responses:
     *       200:
     *         description: Report custom generato.
     */
    router.post('/api/reports/custom', authMiddleware.isIdentified(), (req, res) => reportController.generateCustomReport(req, res));

    return router;
};
