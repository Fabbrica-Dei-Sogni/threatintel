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
