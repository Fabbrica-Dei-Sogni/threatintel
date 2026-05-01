import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { QdrantClientService } from '../services/assistant/QdrantClientService';
import { OllamaService } from '../services/assistant/OllamaService';
import { RagSyncService } from '../services/assistant/RagSyncService';
import { LOGGER_TOKEN, QDRANT_CLIENT_TOKEN, OLLAMA_SERVICE_TOKEN, RAG_SYNC_SERVICE_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { Controller, Post } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = getComponent(AuthMiddleware);

@singleton()
@Controller('/api/assistant')
export class AssistantController {
    constructor(
        @inject(QDRANT_CLIENT_TOKEN) private qdrant: QdrantClientService,
        @inject(OLLAMA_SERVICE_TOKEN) private ollama: OllamaService,
        @inject(RAG_SYNC_SERVICE_TOKEN) private ragSync: RagSyncService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) { }

    /**
     * @openapi
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
    @Post('/search', [auth.isAuthenticated()])
    async search(req: Request, res: Response): Promise<void> {
        const { query, limit = 5, scoreThreshold = 0.5, type } = req.body;

        // Controllo Fallback
        const status = this.ragSync.getStatus();
        if (!status.operational) {
            res.status(503).json({
                error: 'Servizio RAG temporaneamente non disponibile',
                reason: 'L\'infrastruttura IA (Ollama/Qdrant) è offline o in fase di inizializzazione.'
            });
            return;
        }

        this.logger.info(`[AssistantController] RAG Search request: "${query}" (type: ${type || 'any'})`);

        try {
            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'Query di ricerca mancante o non valida' });
                return;
            }

            // 1. Generazione embedding per la query
            const queryVector = await this.ollama.getEmbedding(query);

            // 2. Selezione collection (se type è log usiamo threat_logs, altrimenti intelligence)
            const collection = type === 'threat_log' ? 'threat_logs' : 'threat_intelligence';

            // 3. Ricerca semantica su Qdrant
            const results = await this.qdrant.search(collection, queryVector, limit);

            // 3. Filtraggio opzionale per tipo e score
            const filteredResults = results
                .filter(r => r.score >= scoreThreshold)
                .filter(r => !type || r.payload?.type === type)
                .map(r => ({
                    id: r.id,
                    score: r.score,
                    text: r.payload?.text,
                    metadata: {
                        type: r.payload?.type,
                        ip: r.payload?.ip,
                        timestamp: r.payload?.timestamp || r.payload?.materializedAt,
                        mongoId: r.payload?.mongoId || r.payload?.campaignId
                    }
                }));

            res.json({
                query,
                count: filteredResults.length,
                results: filteredResults
            });
        } catch (err: any) {
            this.logger.error('[AssistantController] RAG Search error:', err);
            res.status(500).json({ error: 'Errore durante la ricerca semantica RAG' });
        }
    }

    /**
     * @openapi
     * /api/assistant/ask:
     *   post:
     *     summary: Risponde a una domanda basandosi sul contesto RAG
     *     tags: [Assistant]
     */
    @Post('/ask', [auth.isAuthenticated()])
    async ask(req: Request, res: Response): Promise<void> {
        const { question } = req.body;

        // Controllo Fallback
        const status = this.ragSync.getStatus();
        if (!status.operational) {
            res.status(503).json({
                error: 'Servizio RAG temporaneamente non disponibile',
                reason: 'L\'infrastruttura IA è offline.'
            });
            return;
        }

        this.logger.info(`[AssistantController] RAG Ask request: "${question}"`);

        try {
            if (!question || typeof question !== 'string') {
                res.status(400).json({ error: 'Domanda mancante' });
                return;
            }

            // 1. Retrieval (Cerchiamo principalmente nella collection intelligence per avere i riassunti)
            const queryVector = await this.ollama.getEmbedding(question);
            const contextResults = await this.qdrant.search('threat_intelligence', queryVector, 3);
            const contextText = contextResults.map(r => r.payload?.text).join('\n---\n');

            // 2. Generation (Augmentation)
            const prompt = `Sei un analista esperto di cybersecurity. Rispondi alla domanda dell'utente basandoti ESCLUSIVAMENTE sul contesto fornito sotto. Se il contesto non contiene informazioni sufficienti, dillo chiaramente.

Contesto di Threat Intelligence:
${contextText}

Domanda: ${question}
Risposta:`;

            const answer = await this.ollama.generate(prompt);

            res.json({
                question,
                answer,
                sources: contextResults.map(r => ({
                    type: r.payload?.type,
                    ip: r.payload?.ip,
                    score: r.score
                }))
            });
        } catch (err: any) {
            this.logger.error('[AssistantController] RAG Ask error:', err);
            res.status(500).json({ error: 'Errore durante la generazione della risposta RAG' });
        }
    }
}
