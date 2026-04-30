/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import express from 'express';
import { ManageLimitController } from '../controllers/ManageLimitController';

export default (manageLimitController: ManageLimitController) => {
    const router = express.Router();

    /**
     * @openapi
     * /blacklist-ip:
     *   post:
     *     tags: [System & Security]
     *     summary: Aggiunge manualmente un IP alla blacklist (violazioni)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [ip]
     *             properties:
     *               ip:
     *                 type: string
     *     responses:
     *       200:
     *         description: IP aggiunto alla blacklist.
     */
    router.post('/api/blacklist-ip', (req, res) => manageLimitController.blacklistIP(req, res));

    /**
     * @openapi
     * /unblacklist-ip:
     *   post:
     *     tags: [System & Security]
     *     summary: Rimuove manualmente un IP dalla blacklist
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [ip]
     *             properties:
     *               ip:
     *                 type: string
     *     responses:
     *       200:
     *         description: IP rimosso dalla blacklist.
     */
    router.post('/api/unblacklist-ip', (req, res) => manageLimitController.unblacklistIP(req, res));

    return router;
};
