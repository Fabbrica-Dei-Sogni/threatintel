import express from 'express';
import { ManageLimitController } from '../controllers/ManageLimitController';

export default (manageLimitController: ManageLimitController) => {
    const router = express.Router();

    router.post('/api/blacklist-ip', (req, res) => manageLimitController.blacklistIP(req, res));

    return router;
};
