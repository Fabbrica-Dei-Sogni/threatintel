import { Router } from 'express';
import { Logger } from 'winston';
import { CowrieController } from '../controllers/CowrieController';

export default function cowrieroutes(logger: Logger, cowrieController: CowrieController) {
    const router = Router();

    // Endpoints dedicati a Cowrie Telnet
    /**
     * @openapi
     * /cowrie/sessions:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Elenca le sessioni catturate da Cowrie (Telnet/SSH)
     *     responses:
     *       200:
     *         description: Elenco sessioni.
     */
    router.get('/api/cowrie/sessions', (req, res) => cowrieController.getSessions(req, res));

    /**
     * @openapi
     * /cowrie/search:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ricerca avanzata nelle sessioni Cowrie
     *     responses:
     *       200:
     *         description: Risultati ricerca.
     */
    router.post('/api/cowrie/search', (req, res) => cowrieController.searchSessions(req, res));

    /**
     * @openapi
     * /cowrie/sessions/{id}/events:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene la timeline degli eventi di una sessione specifica
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Timeline eventi.
     */
    router.get('/api/cowrie/sessions/:id/events', (req, res) => cowrieController.getSessionEvents(req, res));

    /**
     * @openapi
     * /cowrie/sessions/{id}:
     *   get:
     *     tags: [Dashboard API]
     *     summary: Ottiene i dettagli completi di una sessione Cowrie
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dettagli sessione.
     */
    router.get('/api/cowrie/sessions/:id', (req, res) => cowrieController.getSessionDetails(req, res));

    return router;
}
