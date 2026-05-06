import { InjectionToken } from "tsyringe";

/**
 * Centralized DI tokens to avoid stringly-typed tokens across the codebase.
 * Use these exported symbols as tokens for `@inject(...)` and for container registration.
 */
export const LOGGER_TOKEN: InjectionToken<any> = Symbol("Logger");
export const LIFECYCLE_MANAGER_TOKEN = Symbol("LifecycleManager");
export const I18N_TOKEN = Symbol("I18nService");
export const CONFIG_PROVIDER_TOKEN = Symbol("AppConfigProvider");
export const RAG_TRANSLATION_TOKEN = Symbol("RagTranslationService");
export const QDRANT_CLIENT_TOKEN = Symbol("QdrantClientService");
export const OLLAMA_SERVICE_TOKEN = Symbol("OllamaService");
export const RAG_SYNC_SERVICE_TOKEN = Symbol("RagSyncService");
export const RAG_SYNC_WORKER_TOKEN = Symbol("RagSyncWorker");
export const ASSISTANT_SERVICE_TOKEN = Symbol("AssistantService");
export const EVENT_BUS_TOKEN = Symbol("EventBus");
export const RAG_EVENT_LISTENER_TOKEN = Symbol("RagEventListener");
export const STATUS_EVENT_LISTENER_TOKEN = Symbol("StatusEventListener");
export const PRUNING_SERVICE_TOKEN = Symbol("PruningService");
export const MCP_EXECUTOR_TOKEN = Symbol("McpExecutor");
export const FORENSIC_PIPELINE_TOKEN = Symbol("ForensicPipelineService");
export const REDIS_SERVICE_TOKEN = Symbol("RedisService");
export const SSH_LOG_SERVICE_TOKEN = Symbol("SshLogService");
export const NGINX_LOG_SERVICE_TOKEN = Symbol("NginxLogService");
export const COWRIE_SERVICE_TOKEN = Symbol("CowrieService");
export const ANALYSIS_SERVICE_TOKEN = Symbol("AnalysisService");
export const THREAT_LOG_SERVICE_TOKEN = Symbol("ThreatLogService");
export const PATTERN_ANALYSIS_SERVICE_TOKEN = Symbol("PatternAnalysisService");
export const THREAT_LOG_FACTORY_TOKEN = Symbol("ThreatLogFactory");
export const IP_DETAILS_SERVICE_TOKEN = Symbol("IpDetailsService");
export const AUTH_SERVICE_TOKEN = Symbol("AuthService");
export const CONFIG_SERVICE_TOKEN = Symbol("ConfigService");
export const CAMPAIGN_SERVICE_TOKEN = Symbol("CampaignService");
export const DOSSIER_SERVICE_TOKEN = Symbol("DossierService");
export const REPORT_SERVICE_TOKEN = Symbol("ReportService");
export const ATTACK_LOG_SERVICE_TOKEN = Symbol("AttackLogService");
export const STATUS_MANAGER_SERVICE_TOKEN = Symbol("StatusManagerService");
export const RATE_LIMIT_SERVICE_TOKEN = Symbol("RateLimitService");
