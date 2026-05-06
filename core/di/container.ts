import { container, type InjectionToken } from "tsyringe";
import { setupContainer } from "./registry";

/**
 * Main DI Container for the Core application.
 * By default, it initializes the registry on first import for backwards compatibility,
 * but it can also be used to manually control initialization in tests.
 */
export const coreContainer = container;

// Initialize registry automatically for standard application flow
setupContainer();

/**
 * Type-safe helper to resolve components from the container
 */
export function getComponent<T>(token: InjectionToken<T>): T {
    return coreContainer.resolve<T>(token);
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
