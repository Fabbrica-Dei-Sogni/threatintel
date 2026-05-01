import express from 'express';
import { AssistantController } from '../controllers/AssistantController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

export default function assistantroutes(controller: AssistantController, auth: AuthMiddleware) {
    const router = express.Router();

    /**
     * @swagger
     * /api/assistant/search:
     *   post:
     *     summary: Esegue una ricerca semantica RAG
     *     tags: [Assistant]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *               limit:
     *                 type: number
     *               type:
     *                 type: string
     *                 enum: [threat_log, ip_details, campaign_summary]
     */
    router.post('/api/assistant/search', auth.isAuthenticated(), (req, res) => controller.search(req, res));

    /**
     * @swagger
     * /api/assistant/ask:
     *   post:
     *     summary: Risponde a una domanda basandosi sul contesto RAG
     *     tags: [Assistant]
     */
    router.post('/api/assistant/ask', auth.isAuthenticated(), (req, res) => controller.ask(req, res));

    return router;
}
