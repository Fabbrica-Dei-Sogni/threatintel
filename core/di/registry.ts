import { DependencyContainer, Lifecycle } from "tsyringe";
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
import { RateLimitMiddleware } from "../rateLimitMiddleware";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { LifecycleManager } from "../services/LifecycleManager";
import { RouterHub } from "../registry/RouterHub";

import { BackgroundJobManager } from "../services/BackgroundJobManager";
import { SshReanalyzeJob } from "../services/jobs/SshReanalyzeJob";
import { ThreatReanalyzeJob } from "../services/jobs/ThreatReanalyzeJob";

/**
 * Centrally register all components in the DI container.
 * This ensures that metadata is properly captured and dependencies are resolved correctly.
 */
export function setupContainer(container: DependencyContainer) {
    // Infrastructure
    container.registerInstance<Logger>(Tokens.LOGGER_TOKEN, logger);
    container.register(Tokens.LIFECYCLE_MANAGER_TOKEN, { useClass: LifecycleManager }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.EVENT_BUS_TOKEN, { useClass: EventBus }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.REDIS_SERVICE_TOKEN, { useClass: RedisService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.ROUTER_HUB_TOKEN, { useClass: RouterHub }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.RATE_LIMIT_MIDDLEWARE_TOKEN, { useClass: RateLimitMiddleware }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.AUTH_MIDDLEWARE_TOKEN, { useClass: AuthMiddleware }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.BACKGROUND_JOB_MANAGER_TOKEN, { useClass: BackgroundJobManager }, { lifecycle: Lifecycle.Singleton });

    // Jobs
    container.register(Tokens.SSH_REANALYZE_JOB_TOKEN, { useClass: SshReanalyzeJob }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.THREAT_REANALYZE_JOB_TOKEN, { useClass: ThreatReanalyzeJob }, { lifecycle: Lifecycle.Singleton });

    // Core Services
    container.register(Tokens.I18N_TOKEN, { useClass: I18nService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.CONFIG_PROVIDER_TOKEN, { useClass: AppConfigProvider }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.THREAT_LOG_SERVICE_TOKEN, { useClass: ThreatLogService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.IP_DETAILS_SERVICE_TOKEN, { useClass: IpDetailsService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN, { useClass: PatternAnalysisService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.THREAT_LOG_FACTORY_TOKEN, { useClass: ThreatLogFactory }, { lifecycle: Lifecycle.Singleton });
    
    // Feature Services
    container.register(Tokens.SSH_LOG_SERVICE_TOKEN, { useClass: SshLogService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.NGINX_LOG_SERVICE_TOKEN, { useClass: NginxLogService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.COWRIE_SERVICE_TOKEN, { useClass: CowrieService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.ANALYSIS_SERVICE_TOKEN, { useClass: AnalysisService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.AUTH_SERVICE_TOKEN, { useClass: AuthService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.CONFIG_SERVICE_TOKEN, { useClass: ConfigService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.CAMPAIGN_SERVICE_TOKEN, { useClass: CampaignService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.DOSSIER_SERVICE_TOKEN, { useClass: DossierService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.REPORT_SERVICE_TOKEN, { useClass: ReportService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.ATTACK_LOG_SERVICE_TOKEN, { useClass: AttackLogService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.STATUS_MANAGER_SERVICE_TOKEN, { useClass: StatusManagerService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.RATE_LIMIT_SERVICE_TOKEN, { useClass: RateLimitService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.PRUNING_SERVICE_TOKEN, { useClass: PruningService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.STATUS_EVENT_LISTENER_TOKEN, { useClass: StatusEventListener }, { lifecycle: Lifecycle.Singleton });

    // AI & Assistant Services
    container.register(Tokens.RAG_TRANSLATION_TOKEN, { useClass: RagTranslationService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.QDRANT_CLIENT_TOKEN, { useClass: QdrantClientService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.OLLAMA_SERVICE_TOKEN, { useClass: OllamaService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.RAG_SYNC_SERVICE_TOKEN, { useClass: RagSyncService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.RAG_SYNC_WORKER_TOKEN, { useClass: RagSyncWorker }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.ASSISTANT_SERVICE_TOKEN, { useClass: AssistantService }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.RAG_EVENT_LISTENER_TOKEN, { useClass: RagEventListener }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.MCP_EXECUTOR_TOKEN, { useClass: McpNativeExecutor }, { lifecycle: Lifecycle.Singleton });
    container.register(Tokens.FORENSIC_PIPELINE_TOKEN, { useClass: ForensicPipelineService }, { lifecycle: Lifecycle.Singleton });

    return container;
}
