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
     * Informazioni sull'ambiente
     */
    get nodeEnv(): string {
        return process.env.NODE_ENV || ConfigDefaults.NODE_ENV;
    }

    get logLevel(): string {
        return process.env.LOG_LEVEL || ConfigDefaults.LOG_LEVEL;
    }

    get isProduction(): boolean {
        return this.nodeEnv === 'production';
    }

    get isTest(): boolean {
        return this.nodeEnv === 'test';
    }

    get isDevelopment(): boolean {
        return this.nodeEnv === 'development';
    }

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
     * Recupera la base path dell'applicazione (es. /honeypot)
     */
    get appBasePath(): string {
        return process.env.APP_BASE_PATH !== undefined ? process.env.APP_BASE_PATH : ConfigDefaults.APP_BASE_PATH;
    }

    /**
     * Recupera le origini consentite per CORS e CSP
     */
    get allowedOrigins(): string[] {
        return parseCsv(process.env.ALLOWED_ORIGINS, ConfigDefaults.ALLOWED_ORIGINS);
    }

    /**
     * Calcola l'URL base delle API
     */
    get apiBaseUrl(): string {
        const { getApiBaseUrl } = require('../utils/ConfigUtils');
        return getApiBaseUrl(this.appDomain, this.port, process.env.API_BASE_URL, this.appBasePath);
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
     * Tolleranze Scoring
     */
    get dangerScoreRpsTol(): number {
        return parseFloat(process.env.DANGER_SCORE_RPSTOL || ConfigDefaults.DANGER_SCORE_RPSTOL);
    }

    get dangerScoreDurTol(): number {
        return parseFloat(process.env.DANGER_SCORE_DURTOL || ConfigDefaults.DANGER_SCORE_DURTOL);
    }

    get dangerScoreScoreTol(): number {
        return parseFloat(process.env.DANGER_SCORE_SCORETOL || ConfigDefaults.DANGER_SCORE_SCORETOL);
    }

    get dangerScoreDurDecayTol(): number {
        return parseFloat(process.env.DANGER_SCORE_DURDECAYTOL || ConfigDefaults.DANGER_SCORE_DURDECAYTOL);
    }

    /**
     * Configurazione Rate Limiting
     */
    get blacklistDuration(): number {
        return parseInt(process.env.BLACKLIST_DURATION || ConfigDefaults.BLACKLIST_DURATION, 10);
    }

    get logRateLimitEvents(): boolean {
        return (process.env.LOG_RATE_LIMIT_EVENTS || ConfigDefaults.LOG_RATE_LIMIT_EVENTS) === 'true';
    }

    get maxViolations(): number {
        return parseInt(process.env.MAX_VIOLATIONS || ConfigDefaults.MAX_VIOLATIONS, 10);
    }

    get ddosWindowMs(): number {
        return parseInt(process.env.DDOS_WINDOW_MS || ConfigDefaults.DDOS_WINDOW_MS, 10);
    }

    get ddosMaxRequests(): number {
        return parseInt(process.env.DDOS_MAX_REQUESTS || ConfigDefaults.DDOS_MAX_REQUESTS, 10);
    }

    get criticalWindowMs(): number {
        return parseInt(process.env.CRITICAL_WINDOW_MS || ConfigDefaults.CRITICAL_WINDOW_MS, 10);
    }

    get criticalMaxRequests(): number {
        return parseInt(process.env.CRITICAL_MAX_REQUESTS || ConfigDefaults.CRITICAL_MAX_REQUESTS, 10);
    }

    get trapWindowMs(): number {
        return parseInt(process.env.TRAP_WINDOW_MS || ConfigDefaults.TRAP_WINDOW_MS, 10);
    }

    get trapMaxRequests(): number {
        return parseInt(process.env.TRAP_MAX_REQUESTS || ConfigDefaults.TRAP_MAX_REQUESTS, 10);
    }

    get appWindowMs(): number {
        return parseInt(process.env.APP_WINDOW_MS || ConfigDefaults.APP_WINDOW_MS, 10);
    }

    get appMaxRequests(): number {
        return parseInt(process.env.APP_MAX_REQUESTS || ConfigDefaults.APP_MAX_REQUESTS, 10);
    }

    get honeypotInstanceId(): string {
        return process.env.HONEYPOT_INSTANCE_ID || this.appId;
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
