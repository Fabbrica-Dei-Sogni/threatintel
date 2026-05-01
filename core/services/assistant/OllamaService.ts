import { injectable, inject } from 'tsyringe';
import axios from 'axios';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import { AppConfigProvider } from '../AppConfigProvider';

@injectable()
export class OllamaService {
    private baseUrl: string;
    private embeddingModel: string;
    private summaryModel: string;
    private timeout: number = 5000; // 5 secondi max per AI operations

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly config: AppConfigProvider
    ) {
        this.baseUrl = this.config.ollamaUrl;
        this.embeddingModel = this.config.embeddingModel;
        this.summaryModel = this.config.summaryModel;
    }

    /**
     * Ottiene l'embedding di un testo usando il modello configurato (es. nomic-embed-text).
     * @param text Il testo da vettorizzare
     * @returns Un array di numeri (vettore)
     */
    public async getEmbedding(text: string): Promise<number[]> {
        try {
            this.logger.debug(`[Ollama] Requesting embedding for text length: ${text.length}`);
            const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
                model: this.embeddingModel,
                prompt: text
            }, { timeout: this.timeout });

            if (response.data && response.data.embedding) {
                return response.data.embedding;
            }
            throw new Error('Invalid response from Ollama embeddings API');
        } catch (error) {
            this.logger.error(`[Ollama] Error getting embedding: ${error}`);
            throw error;
        }
    }

    /**
     * Genera una risposta testuale (es. riassunto campagna) usando il modello configurato (es. gemma).
     * @param prompt Il prompt completo da inviare
     * @returns La stringa generata
     */
    public async generate(prompt: string): Promise<string> {
        try {
            this.logger.debug(`[Ollama] Generating text with model ${this.summaryModel}`);
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.summaryModel,
                prompt: prompt,
                stream: false
            }, { timeout: 15000 }); // Più tempo per la generazione (15s)

            if (response.data && response.data.response) {
                return response.data.response;
            }
            throw new Error('Invalid response from Ollama generate API');
        } catch (error) {
            this.logger.error(`[Ollama] Error during generation: ${error}`);
            throw error;
        }
    }

    /**
     * Test di connessione verso la VPS Ollama.
     */
    public async checkHealth(): Promise<boolean> {
        try {
            await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
            return true;
        } catch (error) {
            this.logger.warn(`[Ollama] Health check failed: ${error}`);
            return false;
        }
    }
}
