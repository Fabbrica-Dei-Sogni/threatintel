/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { Logger } from "winston";
import { container, type InjectionToken } from "tsyringe";
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
import { LOGGER_TOKEN, I18N_TOKEN, CONFIG_PROVIDER_TOKEN, RAG_TRANSLATION_TOKEN, QDRANT_CLIENT_TOKEN, OLLAMA_SERVICE_TOKEN, RAG_SYNC_SERVICE_TOKEN, RAG_SYNC_WORKER_TOKEN, ASSISTANT_SERVICE_TOKEN, EVENT_BUS_TOKEN, RAG_EVENT_LISTENER_TOKEN } from "./tokens";
import logger from "../../logger";

export const coreContainer = container;

// registra un singleton generico
export function registerSingleton<T>(
    token: InjectionToken<T>,
    useClass: InjectionToken<T>
) {
    coreContainer.registerSingleton<T>(token, useClass);
}

// registra un valore pre–costruito (es. logger)
export function registerValue<T>(token: InjectionToken<T>, value: T) {
    coreContainer.registerInstance<T>(token, value);
}

// risoluzione generica
export function get<T>(token: InjectionToken<T>): T {
    return coreContainer.resolve<T>(token);
}


/**
 * DI Container Setup
 */

// registrazione del logger come valore usando token centralizzato
registerValue<Logger>(LOGGER_TOKEN, logger);

// registrazione del servizio i18n come singleton
coreContainer.registerSingleton(I18N_TOKEN, I18nService);

// registrazione del servizio AppConfigProvider come singleton
coreContainer.registerSingleton(CONFIG_PROVIDER_TOKEN, AppConfigProvider);

// registrazione del servizio RagTranslationService come singleton
coreContainer.registerSingleton(RAG_TRANSLATION_TOKEN, RagTranslationService);

// registrazione del servizio QdrantClientService come singleton
coreContainer.registerSingleton(QDRANT_CLIENT_TOKEN, QdrantClientService);

// registrazione del servizio OllamaService come singleton
coreContainer.registerSingleton(OLLAMA_SERVICE_TOKEN, OllamaService);

// registrazione del servizio RagSyncService come singleton
coreContainer.registerSingleton(RAG_SYNC_SERVICE_TOKEN, RagSyncService);

// registrazione del servizio RagSyncWorker come singleton
coreContainer.registerSingleton(RAG_SYNC_WORKER_TOKEN, RagSyncWorker);

// registrazione del servizio AssistantService come singleton
coreContainer.registerSingleton(ASSISTANT_SERVICE_TOKEN, AssistantService);

// registrazione del servizio EventBus come singleton
coreContainer.registerSingleton(EVENT_BUS_TOKEN, EventBus);

// registrazione del servizio RagEventListener come singleton
coreContainer.registerSingleton(RAG_EVENT_LISTENER_TOKEN, RagEventListener);


// nuova funzione generica
export function getComponent<T>(token: InjectionToken<T>): T {
    return coreContainer.resolve<T>(token);
}

/**
@deprecated
 * Type-safe helper to resolve logger from container
 */
function getLogger(): Logger {
    return get<Logger>(LOGGER_TOKEN);
}

export { coreContainer as container };
