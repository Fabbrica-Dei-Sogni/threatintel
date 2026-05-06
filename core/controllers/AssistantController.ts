import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { AssistantService } from '../services/assistant/AssistantService';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { I18nService } from '../services/I18nService';
import { Controller, Get, Post } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = getComponent(AuthMiddleware);

@singleton()
@Controller('/api/assistant')
export class AssistantController {
    constructor(
        @inject(Tokens.ASSISTANT_SERVICE_TOKEN) private readonly assistant: AssistantService,
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.I18N_TOKEN) private readonly i18n: I18nService
    ) { }

    /**
     * @openapi
     * /assistant/search:
     *   post:
     *     summary: Esegue una ricerca semantica RAG (Cybsersecurity Forensic Search)
     *     description: Interroga il database vettoriale (Qdrant) per trovare minacce, IP o campagne correlate alla query fornita.
     *     tags: [AI Assistant & RAG]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [query]
     *             properties:
     *               query:
     *                 type: string
     *                 description: La query in linguaggio naturale (es. "Log brute force da IP russi")
     *                 example: "Mostrami attacchi recenti sulla porta 22"
     *               limit:
     *                 type: number
     *                 description: Numero massimo di risultati da restituire
     *                 default: 5
     *               scoreThreshold:
     *                 type: number
     *                 description: Soglia minima di similarità (0.0 - 1.0)
     *                 default: 0.7
     *               type:
     *                 type: string
     *                 enum: [threat_log, ip_details, campaign_summary]
     *                 description: Tipo di entità su cui focalizzare la ricerca
     *     responses:
     *       200:
     *         description: Risultati della ricerca semantica trovati con successo.
     *       401:
     *         description: Non autorizzato (Token mancante o scaduto).
     *       500:
     *         description: Errore interno durante la ricerca vettoriale.
     */
    @Post('/search', [auth.isAuthenticated()])
    async search(req: Request, res: Response): Promise<void> {
        const { query, limit, scoreThreshold, type } = req.body;

        try {
            if (!query) {
                res.status(400).json({ error: this.i18n.t('errors.rag.missingQuery') });
                return;
            }

            const results = await this.assistant.search(query, { limit, scoreThreshold, type });

            res.json({
                query,
                count: results.length,
                results
            });
        } catch (err: any) {
            this.logger.error('[AssistantController] RAG Search error:', err);
            res.status(503).json({ error: err.message });
        }
    }

    /**
     * @openapi
     * /assistant/ask:
     *   post:
     *     summary: Genera un'analisi forense basata su RAG
     *     description: Utilizza un LLM (Ollama) per rispondere a una domanda tecnica analizzando i dati recuperati dal database vettoriale.
     *     tags: [AI Assistant & RAG]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [question]
     *             properties:
     *               question:
     *                 type: string
     *                 description: La domanda tecnica da porre all'assistente
     *                 example: "Qual è l'impatto di questi attacchi SSH rilevati?"
     *     responses:
     *       200:
     *         description: Analisi generata con successo.
     *       500:
     *         description: Errore durante la generazione della risposta AI.
     */
    @Post('/ask', [auth.isAuthenticated()])
    async ask(req: Request, res: Response): Promise<void> {
        const { question } = req.body;

        try {
            if (!question) {
                res.status(400).json({ error: this.i18n.t('errors.rag.missingQuestion') });
                return;
            }

            const response = await this.assistant.ask(question);
            res.json(response);
        } catch (err: any) {
            this.logger.error('[AssistantController] RAG Ask error:', err);
            res.status(503).json({ error: err.message });
        }
    }

    /**
     * @openapi
     * /assistant/resolve:
     *   post:
     *     summary: Risolve un riferimento sorgente (SourceRef)
     *     description: Converte un riferimento semantico (hit ID) nei dati tecnici originali presenti nel database SQL/Mongo.
     *     tags: [AI Assistant & RAG]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [sourceRef]
     *             properties:
     *               sourceRef:
     *                 type: string
     *                 description: L'ID del riferimento sorgente da risolvere
     *     responses:
     *       200:
     *         description: Dati tecnici risolti correttamente.
     *       404:
     *         description: Riferimento non trovato.
     */
    @Post('/resolve', [auth.isAuthenticated()])
    async resolve(req: Request, res: Response): Promise<void> {
        const { sourceRef } = req.body;

        try {
            if (!sourceRef) {
                res.status(400).json({ error: this.i18n.t('errors.rag.missingSourceRef') });
                return;
            }

            const data = await this.assistant.resolveSource(sourceRef);
            res.json({
                sourceRef,
                data
            });
        } catch (err: any) {
            this.logger.error('[AssistantController] Source Resolution error:', err);
            res.status(500).json({ error: this.i18n.t('errors.rag.resolveError') });
        }
    }

    /**
     * @openapi
     * /assistant/logs:
     *   post:
     *     summary: Ricerca diretta nei log (Tool MCP)
     *     tags: [AI Assistant & RAG]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SearchLogArgs'
     *     responses:
     *       200:
     *         description: Risultati ricerca log.
     */
    @Post('/logs', [auth.isAuthenticated()])
    async searchLogs(req: Request, res: Response): Promise<void> {
        try {
            const results = await this.assistant.searchLogs(req.body);
            res.json(results);
        } catch (err: any) {
            this.logger.error('[AssistantController] SearchLogs error:', err);
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * @openapi
     * /assistant/attacks:
     *   post:
     *     summary: Ricerca diretta negli attacchi (Tool MCP)
     *     tags: [AI Assistant & RAG]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SearchAttacksArgs'
     *     responses:
     *       200:
     *         description: Risultati ricerca attacchi.
     */
    @Post('/attacks', [auth.isAuthenticated()])
    async searchAttacks(req: Request, res: Response): Promise<void> {
        try {
            const results = await this.assistant.searchAttacks(req.body);
            res.json(results);
        } catch (err: any) {
            this.logger.error('[AssistantController] SearchAttacks error:', err);
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * @openapi
     * /assistant/campaigns:
     *   post:
     *     summary: Ricerca diretta nelle campagne (Tool MCP)
     *     tags: [AI Assistant & RAG]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SearchCampaignsArgs'
     *     responses:
     *       200:
     *         description: Risultati ricerca campagne.
     */
    @Post('/campaigns', [auth.isAuthenticated()])
    async searchCampaigns(req: Request, res: Response): Promise<void> {
        try {
            const results = await this.assistant.searchCampaigns(req.body);
            res.json(results);
        } catch (err: any) {
            this.logger.error('[AssistantController] SearchCampaigns error:', err);
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * @openapi
     * /assistant/integrity-check:
     *   post:
     *     summary: Verifica integrità del Vector Store (Admin Only)
     *     description: Esegue un check di coerenza tra il database vettoriale e le sorgenti dati originali.
     *     tags: [AI Assistant & RAG]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               collection:
     *                 type: string
     *                 description: Nome della collezione da controllare
     *     responses:
     *       200:
     *         description: Report di integrità generato.
     *       403:
     *         description: Permessi insufficienti (Richiesto ruolo admin).
     */
    @Post('/integrity-check', [auth.hasRole('admin')])
    async checkIntegrity(req: Request, res: Response): Promise<void> {
        const { collection } = req.body;
        try {
            if (!collection) {
                res.status(400).json({ error: 'Specificare la collection da controllare' });
                return;
            }

            const stats = await this.assistant.checkSchemaIntegrity(collection);
            res.json(stats);
        } catch (err: any) {
            this.logger.error('[AssistantController] Integrity check error:', err);
            res.status(500).json({ error: 'Errore durante il controllo integrità' });
        }
    }
}
