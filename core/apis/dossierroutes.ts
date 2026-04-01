import express from 'express';
import { DossierController } from '../controllers/DossierController';

export default (controller: DossierController) => {
    const router = express.Router();

    router.get('/api/dossiers', (req, res) => controller.list(req, res));
    router.get('/api/dossiers/:id', (req, res) => controller.getById(req, res));
    router.post('/api/dossiers', (req, res) => controller.create(req, res));
    router.patch('/api/dossiers/:id', (req, res) => controller.update(req, res));
    router.delete('/api/dossiers/:id', (req, res) => controller.delete(req, res));
    router.get('/api/dossiers/:id/export', (req, res) => controller.export(req, res));

    return router;
};
