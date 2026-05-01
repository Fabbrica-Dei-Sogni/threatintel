import { Logger } from "winston";
import { container, type InjectionToken } from "tsyringe";
import { I18nService } from "../services/I18nService";
import { AppConfigProvider } from "../services/AppConfigProvider";
import { RagTranslationService } from "../services/assistant/RagTranslationService";
import { QdrantClientService } from "../services/assistant/QdrantClientService";
import { OllamaService } from "../services/assistant/OllamaService";
import { RagSyncService } from "../services/assistant/RagSyncService";
import { RagSyncWorker } from "../services/assistant/RagSyncWorker";
import { LOGGER_TOKEN, I18N_TOKEN, CONFIG_PROVIDER_TOKEN, RAG_TRANSLATION_TOKEN, QDRANT_CLIENT_TOKEN, OLLAMA_SERVICE_TOKEN, RAG_SYNC_SERVICE_TOKEN, RAG_SYNC_WORKER_TOKEN } from "./tokens";
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
coreContainer.registerSingleton(I18nService);
coreContainer.register(I18N_TOKEN, { useClass: I18nService });

// registrazione del servizio AppConfigProvider come singleton
coreContainer.registerSingleton(AppConfigProvider);
coreContainer.register(CONFIG_PROVIDER_TOKEN, { useClass: AppConfigProvider });

// registrazione del servizio RagTranslationService come singleton
coreContainer.registerSingleton(RagTranslationService);
coreContainer.register(RAG_TRANSLATION_TOKEN, { useClass: RagTranslationService });

// registrazione del servizio QdrantClientService come singleton
coreContainer.registerSingleton(QdrantClientService);
coreContainer.register(QDRANT_CLIENT_TOKEN, { useClass: QdrantClientService });

// registrazione del servizio OllamaService come singleton
coreContainer.registerSingleton(OllamaService);
coreContainer.register(OLLAMA_SERVICE_TOKEN, { useClass: OllamaService });

// registrazione del servizio RagSyncService come singleton
coreContainer.registerSingleton(RagSyncService);
coreContainer.register(RAG_SYNC_SERVICE_TOKEN, { useClass: RagSyncService });

// registrazione del servizio RagSyncWorker come singleton
coreContainer.registerSingleton(RagSyncWorker);
coreContainer.register(RAG_SYNC_WORKER_TOKEN, { useClass: RagSyncWorker });


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
