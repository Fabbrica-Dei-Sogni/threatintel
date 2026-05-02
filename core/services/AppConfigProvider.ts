import { singleton, inject } from 'tsyringe';
import { ConfigService } from './ConfigService';
import { ConfigKey } from '../types/CoreConstants';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class AppConfigProvider {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly configService: ConfigService
    ) {}

    /**
     * Recupera una porta dal .env o default 3000
     */
    get port(): string {
        return process.env.PORT || '3000';
    }

    /**
     * Recupera URI MongoDB dal .env o default
     */
    get mongoUri(): string {
        return process.env.MONGO_URI || 'mongodb://localhost:17017/threatintel';
    }

    /**
     * Recupera URI servizio Auth
     */
    get authUri(): string {
        return process.env.URI_DIGITAL_AUTH || 'https://alessandromodica.com:3443/auth/api/v1';
    }

    /**
     * Recupera App ID per il servizio Auth
     */
    get appId(): string {
        return process.env.APP_ID || process.env.HONEYPOT_INSTANCE_ID || 'threat-intel-01';
    }

    /**
     * Verifica se SSL strict è abilitato per l'Auth
     */
    get authStrictSsl(): boolean {
        return process.env.AUTH_STRICT_SSL !== 'false';
    }

    /**
     * Configurazione Qdrant
     */
    get qdrantUrl(): string {
        return process.env.QDRANT_URL || 'http://localhost:6333';
    }

    get ragEnabled(): boolean {
        return process.env.RAG_ENABLED !== 'false';
    }

    get ragCollectionName(): string {
        return process.env.RAG_COLLECTION_NAME || 'threat_intelligence';
    }

    get ragLogsCollectionName(): string {
        return process.env.RAG_LOGS_COLLECTION_NAME || 'threat_logs';
    }

    /**
     * Configurazione Ollama
     */
    get ollamaUrl(): string {
        return process.env.OLLAMA_URL || 'http://localhost:11434';
    }

    get embeddingModel(): string {
        return process.env.EMBEDDING_MODEL || 'nomic-embed-text';
    }

    get summaryModel(): string {
        return process.env.SUMMARY_MODEL || 'gemma';
    }

    /**
     * Esempi di recupero parametri dinamici da Database tramite ConfigService
     */
    async getDynamicConfig(key: ConfigKey): Promise<string | null> {
        return await this.configService.getConfigValue(key);
    }

    /**
     * Carica i pattern sospetti Nginx
     */
    async getNginxSuspiciousPatterns(): Promise<string[]> {
        const commonEndpoints = process.env.COMMON_ENDPOINTS || '';
        const dbPatterns = await this.getDynamicConfig(ConfigKey.SUSPICIOUS_PATTERNS);
        
        const envList = commonEndpoints.split(',').map(e => e.trim()).filter(Boolean);
        const dbList = dbPatterns ? dbPatterns.split(',').map(e => e.trim()).filter(Boolean) : [];
        
        return Array.from(new Set([...envList, ...dbList]));
    }
}
