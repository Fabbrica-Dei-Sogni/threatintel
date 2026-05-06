import { container } from "tsyringe";
import { Logger } from "winston";
import logger from "../../logger";

// Tokens
import * as Tokens from "./tokens";

// Services
import { I18nService } from "../services/I18nService";
import { AppConfigProvider } from "../services/AppConfigProvider";
import { RagTranslationService } from "../services/assistant/RagTranslationService";
import { QdrantClientService } from "../services/assistant/QdrantClientService";
import { OllamaService } from "../services/assistant/OllamaService";
import { RagSyncService } from "../services/assistant/RagSyncService";
import { RagSyncWorker } from "../services/assistant/RagSyncWorker";
import { AssistantService } from "../services/assistant/AssistantService";
import { EventBus } from "../services/EventBus";
import { RagEventListener } from "../services/assistant/RagEventListener";
import { StatusEventListener } from "../services/StatusEventListener";
import { PruningService } from "../services/PruningService";
import { McpNativeExecutor } from "../assistant/mcp/McpNativeExecutor";
import { ForensicPipelineService } from "../services/forense/ForensicPipelineService";
import { RedisService } from "../services/RedisService";
import { SshLogService } from "../services/SshLogService";
import { NginxLogService } from "../services/NginxLogService";
import { CowrieService } from "../services/CowrieService";
import { AnalysisService } from "../tools/analyze";
import { ThreatLogService } from "../services/ThreatLogService";
import { PatternAnalysisService } from "../services/PatternAnalysisService";
import { ThreatLogFactory } from "../utils/ThreatLogFactory";
import { IpDetailsService } from "../services/IpDetailsService";
import { AuthService } from "../services/AuthService";
import { ConfigService } from "../services/ConfigService";
import { CampaignService } from "../services/CampaignService";
import { DossierService } from "../services/DossierService";
import { ReportService } from "../services/ReportService";
import { AttackLogService } from "../services/AttackLogService";
import { StatusManagerService } from "../services/StatusManagerService";
import { RateLimitService } from "../services/RateLimitService";
import { LifecycleManager } from "../services/LifecycleManager";

/**
 * Centrally register all components in the DI container.
 * This ensures that metadata is properly captured and dependencies are resolved correctly.
 */
export function setupContainer() {
    // Infrastructure
    container.registerInstance<Logger>(Tokens.LOGGER_TOKEN, logger);
    container.registerSingleton(Tokens.LIFECYCLE_MANAGER_TOKEN, LifecycleManager);
    container.registerSingleton(Tokens.EVENT_BUS_TOKEN, EventBus);
    container.registerSingleton(Tokens.REDIS_SERVICE_TOKEN, RedisService);

    // Core Services
    container.registerSingleton(Tokens.I18N_TOKEN, I18nService);
    container.registerSingleton(Tokens.CONFIG_PROVIDER_TOKEN, AppConfigProvider);
    container.registerSingleton(Tokens.THREAT_LOG_SERVICE_TOKEN, ThreatLogService);
    container.registerSingleton(Tokens.IP_DETAILS_SERVICE_TOKEN, IpDetailsService);
    container.registerSingleton(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN, PatternAnalysisService);
    container.registerSingleton(Tokens.THREAT_LOG_FACTORY_TOKEN, ThreatLogFactory);
    
    // Feature Services
    container.registerSingleton(Tokens.SSH_LOG_SERVICE_TOKEN, SshLogService);
    container.registerSingleton(Tokens.NGINX_LOG_SERVICE_TOKEN, NginxLogService);
    container.registerSingleton(Tokens.COWRIE_SERVICE_TOKEN, CowrieService);
    container.registerSingleton(Tokens.ANALYSIS_SERVICE_TOKEN, AnalysisService);
    container.registerSingleton(Tokens.AUTH_SERVICE_TOKEN, AuthService);
    container.registerSingleton(Tokens.CONFIG_SERVICE_TOKEN, ConfigService);
    container.registerSingleton(Tokens.CAMPAIGN_SERVICE_TOKEN, CampaignService);
    container.registerSingleton(Tokens.DOSSIER_SERVICE_TOKEN, DossierService);
    container.registerSingleton(Tokens.REPORT_SERVICE_TOKEN, ReportService);
    container.registerSingleton(Tokens.ATTACK_LOG_SERVICE_TOKEN, AttackLogService);
    container.registerSingleton(Tokens.STATUS_MANAGER_SERVICE_TOKEN, StatusManagerService);
    container.registerSingleton(Tokens.RATE_LIMIT_SERVICE_TOKEN, RateLimitService);
    container.registerSingleton(Tokens.PRUNING_SERVICE_TOKEN, PruningService);
    container.registerSingleton(Tokens.STATUS_EVENT_LISTENER_TOKEN, StatusEventListener);

    // AI & Assistant Services
    container.registerSingleton(Tokens.RAG_TRANSLATION_TOKEN, RagTranslationService);
    container.registerSingleton(Tokens.QDRANT_CLIENT_TOKEN, QdrantClientService);
    container.registerSingleton(Tokens.OLLAMA_SERVICE_TOKEN, OllamaService);
    container.registerSingleton(Tokens.RAG_SYNC_SERVICE_TOKEN, RagSyncService);
    container.registerSingleton(Tokens.RAG_SYNC_WORKER_TOKEN, RagSyncWorker);
    container.registerSingleton(Tokens.ASSISTANT_SERVICE_TOKEN, AssistantService);
    container.registerSingleton(Tokens.RAG_EVENT_LISTENER_TOKEN, RagEventListener);
    container.registerSingleton(Tokens.MCP_EXECUTOR_TOKEN, McpNativeExecutor);
    container.registerSingleton(Tokens.FORENSIC_PIPELINE_TOKEN, ForensicPipelineService);

    return container;
}
