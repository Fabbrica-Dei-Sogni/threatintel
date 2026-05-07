import { injectable, inject } from 'tsyringe';
import axios from 'axios';
import { Logger } from 'winston';
import { AppConfigProvider } from '../AppConfigProvider';

import * as Tokens from '../../di/tokens';

@injectable()
export class OllamaService {
    private baseUrl: string;
    private embeddingModel: string;
    private summaryModel: string;
    private embeddingTimeout: number;
    private generateTimeout: number;
    private numPredict: number;
    private temperature: number;
    private topP: number;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.CONFIG_PROVIDER_TOKEN) private readonly config: AppConfigProvider
    ) {
        this.baseUrl = this.config.ollamaUrl;
        this.embeddingModel = this.config.embeddingModel;
        this.summaryModel = this.config.summaryModel;
        this.embeddingTimeout = this.config.ollamaEmbeddingTimeout;
        this.generateTimeout = this.config.ollamaGenerateTimeout;
        this.numPredict = this.config.ollamaNumPredict;
        this.temperature = this.config.ollamaTemperature;
        this.topP = this.config.ollamaTopP;
    }

    /**
     * Ottiene l'embedding di un testo usando il modello configurato (es. nomic-embed-text).
     * @param text Il testo da vettorizzare
     * @returns Un array di numeri (vettore)
     */
    public async getEmbedding(text: string): Promise<number[]> {
        try {
            this.logger.debug(`[Ollama] Requesting embedding for text length: ${text.length} (Model: ${this.embeddingModel}, URL: ${this.baseUrl}/api/embeddings)`);
            const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
                model: this.embeddingModel,
                prompt: text
            }, { timeout: this.embeddingTimeout });

            if (response.data && response.data.embedding) {
                this.logger.debug(`[Ollama] Successfully received embedding (Size: ${response.data.embedding.length})`);
                return response.data.embedding;
            }
            throw new Error('Invalid response from Ollama embeddings API');
        } catch (error) {
            this.logger.error(`[Ollama] Error getting embedding: ${error.message}`);
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
            this.logger.debug(`[Ollama] Generating text with model ${this.summaryModel} (Prompt length: ${prompt.length})`);
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.summaryModel,
                prompt: prompt,
                stream: false,
                options: {
                    num_predict: this.numPredict,
                    temperature: this.temperature,
                    top_p: this.topP
                }
            }, { timeout: this.generateTimeout });

            if (response.data && response.data.response) {
                this.logger.debug(`[Ollama] Generation successful (Response length: ${response.data.response.length})`);
                return response.data.response;
            }
            throw new Error('Invalid response from Ollama generate API');
        } catch (error) {
            this.logger.error(`[Ollama] Error during generation: ${error.message}`);
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
