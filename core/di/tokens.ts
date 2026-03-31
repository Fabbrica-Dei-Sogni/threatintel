import { InjectionToken } from "tsyringe";

/**
 * Centralized DI tokens to avoid stringly-typed tokens across the codebase.
 * Use these exported symbols as tokens for `@inject(...)` and for container registration.
 */
export const LOGGER_TOKEN: InjectionToken<any> = Symbol("Logger");
export const LIFECYCLE_MANAGER_TOKEN = Symbol("LifecycleManager");
export const I18N_TOKEN = Symbol("I18nService");
