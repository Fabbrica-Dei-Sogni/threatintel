import express from 'express';
import { ReportController } from '../controllers/ReportController';

export default (reportController: ReportController) => {
    const router = express.Router();

    /**
     * @route GET /api/reports/attack
     * @desc Genera un report dossier per un attacco (IP o sessionId)
     */
    router.get('/api/reports/attack', (req, res) => reportController.generateAttackReport(req, res));

    return router;
};
