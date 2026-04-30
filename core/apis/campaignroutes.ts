/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import express from 'express';
import { CampaignController } from '../controllers/CampaignController';

export default (campaignController: CampaignController) => {
    const router = express.Router();

    /**
     * @openapi
     * /campaigns:
     *   get:
     *     tags: [Campaigns Analysis]
     *     summary: Scopre pattern di attacco (hash) condivisi da più IP
     *     parameters:
     *       - name: minIps
     *         in: query
     *         schema:
     *           type: integer
     *           default: 2
     *       - name: minScore
     *         in: query
     *         schema:
     *           type: integer
     *           default: 0
     *       - name: minLogsPerIp
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: protocol
     *         in: query
     *         schema:
     *           type: string
     *           enum: [http, telnet, ssh]
     *           default: http
     *       - name: page
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: pageSize
     *         in: query
     *         schema:
     *           type: integer
     *           default: 10
     *       - name: search
     *         in: query
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Elenco campagne distribuite trovate.
     */
    router.get('/api/campaigns', (req, res) => campaignController.getCampaigns(req, res));

    /**
     * @openapi
     * /campaign/details:
     *   post:
     *     tags: [Campaigns Analysis]
     *     summary: Ottiene dettagli forensi aggregati per una campagna
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [hash]
     *             properties:
     *               hash:
     *                 type: string
     *               minLogsPerIp:
     *                 type: integer
     *               minScore:
     *                 type: number
     *     responses:
     *       200:
     *         description: Dettagli della campagna.
     */
    router.post('/api/campaign/details', (req, res) => campaignController.getCampaignDetail(req, res));

    /**
     * @openapi
     * /campaigns/uris:
     *   get:
     *     tags: [Campaigns Analysis]
     *     summary: Ottiene gli URI unici (Target URLs) coinvolti nelle campagne
     *     parameters:
     *       - name: protocol
     *         in: query
     *         schema:
     *           type: string
     *       - name: minIps
     *         in: query
     *         schema:
     *           type: integer
     *       - name: minScore
     *         in: query
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Elenco degli URI con conteggi.
     */
    router.get('/api/campaigns/uris', (req, res) => campaignController.getUniqueUris(req, res));

    return router;
};
