import { singleton, inject } from 'tsyringe';
import { ConfigService } from './ConfigService';
import { ConfigKey } from '../types/CoreConstants';
import * as Tokens from '../di/tokens';
import { CONFIG_MANIFEST } from '../config/ConfigManifest';
import { parseCsv } from '../utils/ConfigHelpers';

@singleton()
export class AppConfigProvider {
    constructor(
        @inject(Tokens.CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService
    ) { }

    /**
     * Helper per recuperare un parametro dal manifest
     */
    private getParam(key: string): string {
        const param = CONFIG_MANIFEST.find(p => p.key === key);
        
        // 1. Cerca la chiave principale nel .env (process.env)
        if (process.env[key] !== undefined && process.env[key] !== null) {
            return process.env[key]!;
        }

        // 2. Fallback sul default del manifest
        return param?.defaultValue || '';
    }

    /**
     * Helper per recuperare un parametro CSV dal manifest
     */
    private getCsvParam(key: string): string[] {
        const param = CONFIG_MANIFEST.find(p => p.key === key);
        
        // 1. Cerca la chiave principale nel .env
        const value = process.env[key];

        const defaultValueStr = param?.defaultValue || '';
        const defaultList = parseCsv(defaultValueStr);
        
        return parseCsv(value, defaultList);
    }

    /**
     * Recupera una porta dal .env o default
     */
    get port(): string {
        return this.getParam('PORT');
    }

    /**
     * Recupera URI MongoDB dal .env o default
     */
    get mongoUri(): string {
        return this.getParam('MONGO_URI');
    }

    /**
     * Recupera il dominio dell'applicazione
     */
    get appDomain(): string {
        return this.getParam('APP_DOMAIN');
    }

    /**
     * Recupera le origini consentite per CORS e CSP
     */
    get allowedOrigins(): string[] {
        return this.getCsvParam('ALLOWED_ORIGINS');
    }

    /**
     * Percorso root dello storage
     */
    get storageRoot(): string {
        return this.getParam('STORAGE_ROOT');
    }

    /**
     * Versione dell'applicazione
     */
    get version(): string {
        return this.getParam('VERSION');
    }

    /**
     * Recupera la lista degli endpoint comuni (trappole) dal .env
     */
    get commonEndpoints(): string[] {
        return this.getCsvParam('COMMON_ENDPOINTS');
    }

    /**
     * Recupera URI servizio Auth
     */
    get authUri(): string {
        return this.getParam('URI_DIGITAL_AUTH');
    }

    /**
     * Recupera App ID per il servizio Auth
     */
    get appId(): string {
        return this.getParam('APP_ID');
    }

    /**
     * Identificativo istanza per Rate Limiter
     */
    get honeypotInstanceId(): string {
        return this.getParam('HONEYPOT_INSTANCE_ID');
    }

    /**
     * Verifica se SSL strict è abilitato per l'Auth
     */
    get authStrictSsl(): boolean {
        return this.getParam('AUTH_STRICT_SSL') !== 'false';
    }

    /**
     * Verifica se l'accesso anonimo è consentito
     */
    get allowAnonymous(): boolean {
        return this.getParam('ALLOW_ANONYMOUS') === 'true';
    }

    /**
     * Recupera il ruolo per gli utenti anonimi
     */
    get anonymousRole(): string {
        return this.getParam('ANONYMOUS_ROLE');
    }

    /**
     * Configurazione Qdrant
     */
    get qdrantUrl(): string {
        return this.getParam('QDRANT_URL');
    }

    get ragEnabled(): boolean {
        return this.getParam('RAG_ENABLED') !== 'false';
    }

    get ragCollectionName(): string {
        return this.getParam('RAG_COLLECTION_NAME');
    }

    get ragLogsCollectionName(): string {
        return this.getParam('RAG_LOGS_COLLECTION_NAME');
    }

    get ragAiSummaryEnabled(): boolean {
        return this.getParam('RAG_AI_SUMMARY_ENABLED') === 'true';
    }

    get ragReindexThresholdDays(): number {
        return parseFloat(this.getParam('RAG_REINDEX_THRESHOLD_DAYS'));
    }

    /**
     * Configurazione Ollama
     */
    get ollamaUrl(): string {
        return this.getParam('OLLAMA_URL');
    }

    get embeddingModel(): string {
        return this.getParam('EMBEDDING_MODEL');
    }

    get summaryModel(): string {
        return this.getParam('SUMMARY_MODEL');
    }

    get ollamaEmbeddingTimeout(): number {
        return parseInt(this.getParam('OLLAMA_EMBEDDING_TIMEOUT'), 10);
    }

    get ollamaGenerateTimeout(): number {
        return parseInt(this.getParam('OLLAMA_GENERATE_TIMEOUT'), 10);
    }

    get ollamaNumPredict(): number {
        return parseInt(this.getParam('OLLAMA_NUM_PREDICT'), 10);
    }

    get ollamaTemperature(): number {
        return parseFloat(this.getParam('OLLAMA_TEMPERATURE'));
    }

    get ollamaTopP(): number {
        return parseFloat(this.getParam('OLLAMA_TOP_P'));
    }

    /**
     * Configurazione IP Details e Cache
     */
    get excludedIps(): string[] {
        return this.getCsvParam('EXCLUDED_IPS');
    }

    get ipCacheMaxAgeHours(): number {
        return parseInt(this.getParam('IP_CACHE_MAX_AGE_HOURS'), 10);
    }

    get abuseIpDbKey(): string | undefined {
        return this.getParam('ABUSEIPDB_KEY') || undefined;
    }

    get ipInfoToken(): string | undefined {
        return this.getParam('IPINFO_TOKEN') || undefined;
    }

    /**
     * Configurazione Log Prefix
     */
    get nginxLogPrefix(): string {
        return this.getParam('NGINX_LOG_PREFIX');
    }

    /**
     * Configurazione Analisi Periodica
     */
    get analyzeInterval(): string {
        return this.getParam('ANALYZE_INTERVAL');
    }

    /**
     * Configurazione Redis
     */
    get redisHost(): string | undefined {
        return this.getParam('REDIS_HOST');
    }

    get redisPort(): number {
        return parseInt(this.getParam('REDIS_PORT'), 10);
    }

    get redisPassword(): string | undefined {
        return this.getParam('REDIS_PASSWORD') || undefined;
    }

    get redisDb(): number {
        return parseInt(this.getParam('REDIS_DB'), 10);
    }

    get redisConnectTimeoutMs(): number {
        return parseInt(this.getParam('REDIS_CONNECT_TIMEOUT_MS'), 10);
    }

    get redisCommandTimeoutMs(): number {
        return parseInt(this.getParam('REDIS_COMMAND_TIMEOUT_MS'), 10);
    }

    get redisRetryDelayMs(): number {
        return parseInt(this.getParam('REDIS_RETRY_DELAY_MS'), 10);
    }

    get redisMaxRetryDelayMs(): number {
        return parseInt(this.getParam('REDIS_MAX_RETRY_DELAY_MS'), 10);
    }

    get redisAutoConnectInTest(): boolean {
        return this.getParam('REDIS_RATE_LIMIT_AUTO_CONNECT_IN_TEST') === 'true';
    }

    /**
     * Configurazione Rate Limiting & Blacklist
     */
    get ddosWindowMs(): number {
        return parseInt(this.getParam('DDOS_WINDOW_MS'), 10);
    }

    get ddosMaxRequests(): number {
        return parseInt(this.getParam('DDOS_MAX_REQUESTS'), 10);
    }

    get maxViolations(): number {
        return parseInt(this.getParam('MAX_VIOLATIONS'), 10);
    }

    get blacklistDuration(): number {
        return parseInt(this.getParam('BLACKLIST_DURATION'), 10);
    }

    get logRateLimitEvents(): boolean {
        return this.getParam('LOG_RATE_LIMIT_EVENTS') === 'true';
    }

    get dashboardPath(): string {
        return (this.getParam('HONEYPOT_DASHBOARD_PATH') || '/honeypot').toLowerCase();
    }

    get criticalWindowMs(): number {
        return parseInt(this.getParam('CRITICAL_WINDOW_MS'), 10);
    }

    get criticalMaxRequests(): number {
        return parseInt(this.getParam('CRITICAL_MAX_REQUESTS'), 10);
    }

    get trapWindowMs(): number {
        return parseInt(this.getParam('TRAP_WINDOW_MS'), 10);
    }

    get trapMaxRequests(): number {
        return parseInt(this.getParam('TRAP_MAX_REQUESTS'), 10);
    }

    get appWindowMs(): number {
        return parseInt(this.getParam('APP_WINDOW_MS'), 10);
    }

    get appMaxRequests(): number {
        return parseInt(this.getParam('APP_MAX_REQUESTS'), 10);
    }

    /**
     * Configurazione Danger Weights (Analisi Forense)
     */
    get dangerWeightRpsNorm(): number {
        return parseFloat(this.getParam('DANGER_WEIGHT_RPSNORM'));
    }

    get dangerWeightDurNorm(): number {
        return parseFloat(this.getParam('DANGER_WEIGHT_DURNORM'));
    }

    get dangerWeightScoreNorm(): number {
        return parseFloat(this.getParam('DANGER_WEIGHT_SCORENORM'));
    }

    get dangerWeightUniqueTechNorm(): number {
        return parseFloat(this.getParam('DANGER_WEIGHT_UNIQUETECHNORM'));
    }

    get dangerWeightDistributed(): number {
        return parseFloat(this.getParam('DANGER_WEIGHT_DISTRIBUTED'));
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
