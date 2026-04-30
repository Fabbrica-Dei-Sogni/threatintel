import express from 'express';
import { AuthController } from '../controllers/AuthController';

export default (authController: AuthController) => {
    const router = express.Router();

    /**
     * @openapi
     * /auth/login:
     *   post:
     *     tags: [Auth Proxy]
     *     summary: Effettua il login verso l'Identity Provider
     *     description: Invia le credenziali al Digital-Auth-TS e restituisce un JWT token.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [username, password]
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login riuscito, token restituito.
     *       401:
     *         description: Credenziali non valide o accesso negato.
     */
    router.post('/auth/login', (req, res) => authController.login(req, res));

    /**
     * @openapi
     * /auth/register:
     *   post:
     *     tags: [Auth Proxy]
     *     summary: Registra un nuovo utente sull'Identity Provider
     *     description: Crea un nuovo account associato a questa istanza di ThreatIntel.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [username, password, email]
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *               email:
     *                 type: string
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *     responses:
     *       201:
     *         description: Registrazione completata, email di attivazione inviata.
     *       400:
     *         description: Dati non validi o utente già esistente.
     */
    router.post('/auth/register', (req, res) => authController.register(req, res));

    /**
     * @openapi
     * /auth/mode:
     *   get:
     *     tags: [Auth Proxy]
     *     summary: Ottiene la modalità di autenticazione corrente
     *     responses:
     *       200:
     *         description: Modalità di autenticazione (proxy o locale).
     */
    router.get('/auth/mode', (req, res) => authController.getAuthMode(req, res));

    return router;
};
