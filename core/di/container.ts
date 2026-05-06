import { container, type InjectionToken } from "tsyringe";

/**
 * Main DI Container for the Core application.
 */
export const coreContainer = container;

/**
 * Type-safe helper to resolve components from the container
 */
export function getComponent<T>(token: InjectionToken<T>): T {
    return coreContainer.resolve<T>(token as any);
}

/**
 * Unified registration helpers
 */
export function registerSingleton<T>(token: InjectionToken<T>, useClass: any) {
    coreContainer.registerSingleton(token, useClass);
}

export function registerValue<T>(token: InjectionToken<T>, value: T) {
    coreContainer.registerInstance(token, value);
}

// Backwards compatibility exports
export { coreContainer as container };
export function get<T>(token: InjectionToken<T>): T {
    return coreContainer.resolve<T>(token);
}
