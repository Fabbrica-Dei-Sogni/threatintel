import express from 'express';
import { ConfigController } from '../controllers/ConfigController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

export default (configController: ConfigController, authMiddleware: AuthMiddleware) => {
    const router = express.Router();

    /**
     * @openapi
     * /config:
     *   get:
     *     tags: [System & Security]
     *     summary: Recupera tutte le configurazioni di sistema
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Elenco configurazioni restituito.
     */
    router.get('/api/config', authMiddleware.hasRole('admin'), (req, res) => configController.getAllConfigs(req, res));

    /**
     * @openapi
     * /config:
     *   post:
     *     tags: [System & Security]
     *     summary: Salva o aggiorna una configurazione
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               key:
     *                 type: string
     *               value:
     *                 type: string
     *     responses:
     *       200:
     *         description: Configurazione salvata.
     */
    router.post('/api/config', authMiddleware.hasRole('admin'), (req, res) => configController.saveConfig(req, res));

    /**
     * @openapi
     * /config/{key}:
     *   delete:
     *     tags: [System & Security]
     *     summary: Elimina una configurazione tramite chiave
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: key
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Configurazione eliminata.
     */
    router.delete('/api/config/:key', authMiddleware.hasRole('admin'), (req, res) => configController.deleteConfig(req, res));

    /**
     * @openapi
     * /config/search:
     *   post:
     *     tags: [System & Security]
     *     summary: Ricerca tra le chiavi di configurazione
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *     responses:
     *       200:
     *         description: Risultati della ricerca.
     */
    router.post('/api/config/search', authMiddleware.hasRole('admin'), (req, res) => configController.searchConfigs(req, res));

    return router;
};
