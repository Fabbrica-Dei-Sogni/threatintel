import express from 'express';
import { DossierController } from '../controllers/DossierController';

export default (controller: DossierController) => {
    const router = express.Router();

    /**
     * @openapi
     * /dossiers:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Elenca tutti i dossier investigativi
     *     responses:
     *       200:
     *         description: Elenco dossier.
     */
    router.get('/api/dossiers', (req, res) => controller.list(req, res));

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
    router.get('/api/dossiers/:id', (req, res) => controller.getById(req, res));

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
     *     responses:
     *       201:
     *         description: Dossier creato.
     */
    router.post('/api/dossiers', (req, res) => controller.create(req, res));

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
     *     responses:
     *       200:
     *         description: Dossier aggiornato.
     */
    router.patch('/api/dossiers/:id', (req, res) => controller.update(req, res));

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
    router.delete('/api/dossiers/:id', (req, res) => controller.delete(req, res));

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
     *     responses:
     *       200:
     *         description: File esportato con successo.
     */
    router.get('/api/dossiers/:id/export', (req, res) => controller.export(req, res));

    return router;
};
