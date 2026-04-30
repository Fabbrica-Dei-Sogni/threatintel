/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import express from 'express';
import { DossierController } from '../controllers/DossierController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

export default (controller: DossierController, authMiddleware: AuthMiddleware) => {
    const router = express.Router();

    /**
     * @openapi
     * /dossiers:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Elenca tutti i dossier investigativi
     *     parameters:
     *       - name: status
     *         in: query
     *         schema:
     *           type: string
     *       - name: tags
     *         in: query
     *         description: Filtra per tag (separati da virgola)
     *         schema:
     *           type: string
     *       - name: ip
     *         in: query
     *         schema:
     *           type: string
     *       - name: search
     *         in: query
     *         schema:
     *           type: string
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
     *     responses:
     *       200:
     *         description: Elenco dossier.
     */
    router.get('/api/dossiers', authMiddleware.isIdentified(), (req, res) => controller.list(req, res));

    /**
     * @openapi
     * /dossiers/{id}:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Ottiene un dossier specifico tramite ID
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dettaglio dossier.
     */
    router.get('/api/dossiers/:id', authMiddleware.isIdentified(), (req, res) => controller.getById(req, res));

    /**
     * @openapi
     * /dossiers:
     *   post:
     *     tags: [Dossier & Forensics]
     *     summary: Crea un nuovo dossier investigativo
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [title, sections]
     *             properties:
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *               sections:
     *                 type: array
     *                 items:
     *                   type: object
     *               tags:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       201:
     *         description: Dossier creato.
     */
    router.post('/api/dossiers', authMiddleware.isIdentified(), (req, res) => controller.create(req, res));

    /**
     * @openapi
     * /dossiers/{id}:
     *   patch:
     *     tags: [Dossier & Forensics]
     *     summary: Aggiorna un dossier esistente
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *               status:
     *                 type: string
     *                 enum: [open, closed, archived]
     *               sections:
     *                 type: array
     *                 items:
     *                   type: object
     *               tags:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       200:
     *         description: Dossier aggiornato.
     */
    router.patch('/api/dossiers/:id', authMiddleware.isIdentified(), (req, res) => controller.update(req, res));

    /**
     * @openapi
     * /dossiers/{id}:
     *   delete:
     *     tags: [Dossier & Forensics]
     *     summary: Elimina un dossier investigativo
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dossier eliminato.
     */
    router.delete('/api/dossiers/:id', authMiddleware.isIdentified(), (req, res) => controller.delete(req, res));

    /**
     * @openapi
     * /dossiers/{id}/export:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Esporta un dossier in formato forense (Classico/HUD)
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *       - name: format
     *         in: query
     *         schema:
     *           type: string
     *           enum: [html, pdf]
     *           default: pdf
     *       - name: style
     *         in: query
     *         schema:
     *           type: string
     *           enum: [classic, hud, telex]
     *           default: classic
     *       - name: locale
     *         in: query
     *         schema:
     *           type: string
     *           default: it-IT
     *     responses:
     *       200:
     *         description: File esportato con successo.
     */
    router.get('/api/dossiers/:id/export', authMiddleware.isIdentified(), (req, res) => controller.export(req, res));

    return router;
};
