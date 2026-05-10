import { singleton, inject } from 'tsyringe';
import { ConfigService } from './ConfigService';
import { ConfigKey } from '../types/CoreConstants';
import * as Tokens from '../di/tokens';

import { ConfigDefaults, parseCsv } from '../utils/ConfigUtils';

@singleton()
export class AppConfigProvider {
    constructor(
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

    get ragAiSummaryEnabled(): boolean {
        return process.env.RAG_AI_SUMMARY_ENABLED === 'true';
    }

    get ragReindexThresholdDays(): number {
        return parseFloat(process.env.RAG_REINDEX_THRESHOLD_DAYS || ConfigDefaults.RAG_REINDEX_THRESHOLD_DAYS);
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

    get ollamaEmbeddingTimeout(): number {
        return parseInt(process.env.OLLAMA_EMBEDDING_TIMEOUT || ConfigDefaults.OLLAMA_EMBEDDING_TIMEOUT, 10);
    }

    get ollamaGenerateTimeout(): number {
        return parseInt(process.env.OLLAMA_GENERATE_TIMEOUT || ConfigDefaults.OLLAMA_GENERATE_TIMEOUT, 10);
    }

    get ollamaNumPredict(): number {
        return parseInt(process.env.OLLAMA_NUM_PREDICT || ConfigDefaults.OLLAMA_NUM_PREDICT, 10);
    }

    get ollamaTemperature(): number {
        return parseFloat(process.env.OLLAMA_TEMPERATURE || ConfigDefaults.OLLAMA_TEMPERATURE);
    }

    get ollamaTopP(): number {
        return parseFloat(process.env.OLLAMA_TOP_P || ConfigDefaults.OLLAMA_TOP_P);
    }

    /**
     * Configurazione IP Details e Cache
     */
    get excludedIps(): string[] {
        return parseCsv(process.env.EXCLUDED_IPS, ['127.0.0.1', '::1', 'localhost']);
    }

    get ipCacheMaxAgeHours(): number {
        return parseInt(process.env.IP_CACHE_MAX_AGE_HOURS || ConfigDefaults.IP_CACHE_MAX_AGE_HOURS, 10);
    }

    get abuseIpDbKey(): string | undefined {
        return process.env.ABUSEIPDB_KEY;
    }

    get ipInfoToken(): string | undefined {
        return process.env.IPINFO_TOKEN;
    }

    /**
     * Configurazione Log Prefix
     */
    get nginxLogPrefix(): string {
        return process.env.NGINX_LOG_PREFIX || 'nginx_threat:';
    }

    /**
     * Configurazione Analisi Periodica
     */
    get analyzeInterval(): string {
        return process.env.ANALYZE_INTERVAL || '5m';
    }

    /**
     * Configurazione Redis
     */
    get redisHost(): string | undefined {
        return process.env.REDIS_HOST || ConfigDefaults.REDIS_HOST;
    }

    get redisPort(): number {
        return parseInt(process.env.REDIS_PORT || ConfigDefaults.REDIS_PORT, 10);
    }

    get redisPassword(): string | undefined {
        return process.env.REDIS_PASSWORD;
    }

    get redisDb(): number {
        return parseInt(process.env.REDIS_DB || ConfigDefaults.REDIS_DB, 10);
    }

    get redisConnectTimeoutMs(): number {
        return parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || ConfigDefaults.REDIS_CONNECT_TIMEOUT_MS, 10);
    }

    get redisCommandTimeoutMs(): number {
        return parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || ConfigDefaults.REDIS_COMMAND_TIMEOUT_MS, 10);
    }

    get redisAutoConnectInTest(): boolean {
        return process.env.REDIS_RATE_LIMIT_AUTO_CONNECT_IN_TEST === 'true';
    }

    /**
     * Configurazione Danger Weights (Analisi Forense)
     */
    get dangerWeightRpsNorm(): number {
        return parseFloat(process.env.DANGER_WEIGHT_RPSNORM || ConfigDefaults.DANGER_WEIGHT_RPSNORM);
    }

    get dangerWeightDurNorm(): number {
        return parseFloat(process.env.DANGER_WEIGHT_DURNORM || ConfigDefaults.DANGER_WEIGHT_DURNORM);
    }

    get dangerWeightScoreNorm(): number {
        return parseFloat(process.env.DANGER_WEIGHT_SCORENORM || ConfigDefaults.DANGER_WEIGHT_SCORENORM);
    }

    get dangerWeightUniqueTechNorm(): number {
        return parseFloat(process.env.DANGER_WEIGHT_UNIQUETECHNORM || ConfigDefaults.DANGER_WEIGHT_UNIQUETECHNORM);
    }

    get dangerWeightDistributed(): number {
        return parseFloat(process.env.DANGER_WEIGHT_DISTRIBUTED || ConfigDefaults.DANGER_WEIGHT_DISTRIBUTED);
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
