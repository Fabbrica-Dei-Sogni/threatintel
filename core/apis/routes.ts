import express from 'express';
import { RateLimitMiddleware } from '../rateLimitMiddleware';
import { FakeLoginController } from '../controllers/FakeLoginController';

export default (logger: any, fakeLoginController: FakeLoginController, rateLimitMiddleware: RateLimitMiddleware) => {
    const router = express.Router();

    // I middleware ddos e application sono già applicati globalmente in endpoint.ts
    // Non caricarli qui per evitare ERR_ERL_DOUBLE_COUNT


    /**
     * @openapi
     * /:
     *   get:
     *     tags: [Honeypot Traps]
     *     summary: Mostra la pagina di finto login (esca)
     *     description: Restituisce l'HTML della pagina di login utilizzata per catturare le credenziali degli attaccanti.
     *     responses:
     *       200:
     *         description: Pagina HTML caricata con successo.
     */
    router.get('/', rateLimitMiddleware.criticalEndpointsLimiter(), (req, res) => fakeLoginController.showFakeLogin(req, res));

    /**
     * @openapi
     * /login:
     *   post:
     *     tags: [Honeypot Traps]
     *     summary: Gestisce il tentativo di login sulla trappola
     *     description: Analizza le credenziali fornite, logga l'attacco e reindirizza l'attaccante.
     *     requestBody:
     *       required: true
     *       content:
     *         application/x-www-form-urlencoded:
     *           schema:
     *             type: object
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       302:
     *         description: Reindirizzamento dell'attaccante.
     */
    router.post('/login', rateLimitMiddleware.criticalEndpointsLimiter(), (req, res) => fakeLoginController.handleFakeLogin(req, res));

    const commonEndpoints = (process.env.COMMON_ENDPOINTS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

    if (commonEndpoints.length) logger.info(`[routes] COMMON_ENDPOINTS caricati: ${commonEndpoints.join(', ')}`);

    /**
     * @openapi
     * /common-endpoints:
     *   all:
     *     tags: [Honeypot Traps]
     *     summary: Endpoint comuni configurabili (es. /wp-admin, /admin)
     *     description: Gestisce tutte le richieste verso endpoint comuni definiti in configurazione come trappole.
     *     responses:
     *       200:
     *         description: Risposta della trappola.
     */
    commonEndpoints.forEach(endpoint => {
        router.all(endpoint, rateLimitMiddleware.trapEndpointsLimiter(), (req, res) => fakeLoginController.handleTrap(req, res));
    });

    router.use('*', (req, res) => fakeLoginController.handleNotFound(req, res));

    router.use((error: any, req: any, res: any, next: any) => fakeLoginController.handleError(error, req, res));

    return router;
};
