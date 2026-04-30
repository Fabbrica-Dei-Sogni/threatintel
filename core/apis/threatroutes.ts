/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import express from 'express';
import { ThreatController } from '../controllers/ThreatController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

export default (
    threatController: ThreatController, 
    authMiddleware: AuthMiddleware
) => {
    const router = express.Router();


    /**

     * @openapi
     * /stats:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene le statistiche generali delle minacce
     *     parameters:
     *       - name: timeframe
     *         in: query
     *         schema:
     *           type: string
     *           enum: [1h, 24h, 7d, 30d]
     *           default: 24h
     *       - name: minScore
     *         in: query
     *         schema:
     *           type: integer
     *           default: 15
     *       - name: top
     *         in: query
     *         schema:
     *           type: string
     *           default: '10'
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
     *     parameters:
     *       - name: page
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: pageSize
     *         in: query
     *         schema:
     *           type: integer
     *           default: 20
     *       - name: ip
     *         in: query
     *         schema:
     *           type: string
     *       - name: suspicious
     *         in: query
     *         schema:
     *           type: string
     *           enum: ['true', 'false']
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
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               page:
     *                 type: integer
     *               pageSize:
     *                 type: integer
     *               filters:
     *                 type: object
     *               sortFields:
     *                 type: object
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
     * /attack/distributed:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli investigativi per un cluster di IP (Attacco Distribuito)
     *     responses:
     *       200:
     *         description: Dettagli dell'attacco distribuito.
     */
    router.post('/api/attack/distributed', (req, res) => threatController.getDistributedAttackDetails(req, res));

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
    
    return router;
};

