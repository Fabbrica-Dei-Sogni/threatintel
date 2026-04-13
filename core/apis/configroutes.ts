import express from 'express';
import { ConfigController } from '../controllers/ConfigController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

export default (configController: ConfigController, authMiddleware: AuthMiddleware) => {
    const router = express.Router();

    /**
     * Recupera tutte le configurazioni
     * GET /api/config
     */
    router.get('/api/config', authMiddleware.hasRole('admin'), (req, res) => configController.getAllConfigs(req, res));

    /**
     * Salva o aggiorna una configurazione
     * POST /api/config
     */
    router.post('/api/config', authMiddleware.hasRole('admin'), (req, res) => configController.saveConfig(req, res));

    /**
     * Elimina una configurazione
     * DELETE /api/config/:key
     */
    router.delete('/api/config/:key', authMiddleware.hasRole('admin'), (req, res) => configController.deleteConfig(req, res));

    /**
     * Ricerca configurazioni
     * POST /api/config/search
     */
    router.post('/api/config/search', authMiddleware.hasRole('admin'), (req, res) => configController.searchConfigs(req, res));

    return router;
};
