import { singleton, inject } from 'tsyringe';
import { ConfigService } from './ConfigService';
import { ConfigKey } from '../types/CoreConstants';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { ConfigDefaults, parseCsv } from '../utils/ConfigUtils';

@singleton()
export class AppConfigProvider {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService
    ) { }

    /**
     * Recupera una porta dal .env o default
     */
    get port(): string {
        return process.env.PORT || ConfigDefaults.PORT;
    }

    /**
     * Recupera URI MongoDB dal .env o default
     */
    get mongoUri(): string {
        return process.env.MONGO_URI || ConfigDefaults.MONGO_URI;
    }

    /**
     * Recupera il dominio dell'applicazione
     */
    get appDomain(): string {
        return process.env.APP_DOMAIN || ConfigDefaults.APP_DOMAIN;
    }

    /**
     * Recupera le origini consentite per CORS e CSP
     */
    get allowedOrigins(): string[] {
        return parseCsv(process.env.ALLOWED_ORIGINS, ConfigDefaults.ALLOWED_ORIGINS);
    }

    /**
     * Recupera la lista degli endpoint comuni (trappole) dal .env
     */
    get commonEndpoints(): string[] {
        return parseCsv(process.env.COMMON_ENDPOINTS);
    }

    /**
     * Recupera URI servizio Auth
     */
    get authUri(): string {
        return process.env.URI_DIGITAL_AUTH || ConfigDefaults.AUTH_URI;
    }

    /**
     * Recupera App ID per il servizio Auth
     */
    get appId(): string {
        return process.env.APP_ID || ConfigDefaults.APP_ID;
    }

    /**
     * Verifica se SSL strict è abilitato per l'Auth
     */
    get authStrictSsl(): boolean {
        return process.env.AUTH_STRICT_SSL !== 'false';
    }

    /**
     * Verifica se l'accesso anonimo è consentito
     */
    get allowAnonymous(): boolean {
        return process.env.ALLOW_ANONYMOUS === 'true';
    }

    /**
     * Recupera il ruolo per gli utenti anonimi
     */
    get anonymousRole(): string {
        return process.env.ANONYMOUS_ROLE || 'viewer';
    }

    /**
     * Configurazione Qdrant
     */
    get qdrantUrl(): string {
        return process.env.QDRANT_URL || ConfigDefaults.QDRANT_URL;
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

    get ragSchemaVersion(): string {
        return process.env.RAG_SCHEMA_VERSION || '0.0.1';
    }

    /**
     * Configurazione Ollama
     */
    get ollamaUrl(): string {
        return process.env.OLLAMA_URL || ConfigDefaults.OLLAMA_URL;
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
        const envList = this.commonEndpoints;
        const dbPatterns = await this.getDynamicConfig(ConfigKey.SUSPICIOUS_PATTERNS);
        const dbList = parseCsv(dbPatterns || '');

        return Array.from(new Set([...envList, ...dbList]));
    }
}
