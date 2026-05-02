/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { Router } from 'express';
import { singleton, DependencyContainer } from 'tsyringe';
import { METADATA_KEYS, EndpointMetadata } from './metadata';
import { logger } from '../../logger';

@singleton()
export class RouterHub {
    private registeredControllers: any[] = [];

    register(controllerClass: any) {
        this.registeredControllers.push(controllerClass);
    }

    bindHttp(router: Router, container: DependencyContainer) {
        this.registeredControllers.forEach(controllerClass => {
            const instance = container.resolve(controllerClass);
            const basePath = Reflect.getMetadata(METADATA_KEYS.CONTROLLER_PATH, controllerClass) || '';
            const endpoints: EndpointMetadata[] = Reflect.getMetadata(METADATA_KEYS.ENDPOINTS, controllerClass) || [];

            // Ordina gli endpoint: prima i path specifici, poi i catch-all (*), poi gli error handler (4 args)
            const sortedEndpoints = [...endpoints].sort((a, b) => {
                const aIsErrorHandler = (instance as any)[a.handlerName].length === 4;
                const bIsErrorHandler = (instance as any)[b.handlerName].length === 4;
                if (aIsErrorHandler && !bIsErrorHandler) return 1;
                if (!aIsErrorHandler && bIsErrorHandler) return -1;

                const aIsCatchAll = a.path === '*' || a.path === '/*';
                const bIsCatchAll = b.path === '*' || b.path === '/*';
                if (aIsCatchAll && !bIsCatchAll) return 1;
                if (!aIsCatchAll && bIsCatchAll) return -1;

                return 0;
            });

            sortedEndpoints.filter(e => e.protocol === 'http').forEach(endpoint => {
                const fullPath = `${basePath}${endpoint.path}`.replace(/\/+/g, '/');
                const method = endpoint.method!;
                let handler = (instance as any)[endpoint.handlerName].bind(instance);
                
                // Se è un error handler (4 argomenti), dobbiamo assicurarci che Express lo riconosca come tale.
                // Il .bind() preserva la length, ma per sicurezza se la length originale è 4, usiamo un wrapper esplicito.
                if ((instance as any)[endpoint.handlerName].length === 4) {
                    const boundHandler = handler;
                    handler = (err: any, req: any, res: any, next: any) => boundHandler(err, req, res, next);
                }
                const middlewares = endpoint.middlewares || [];

                logger.info(`[RouterHub] Binding ${method.toUpperCase()} ${fullPath} to ${controllerClass.name}.${String(endpoint.handlerName)}`);
                
                (router as any)[method](fullPath, ...middlewares, handler);
            });
        });
    }

    bindWebSockets(io: any, container: DependencyContainer) {
        // Logic for socket.io integration in the future
        this.registeredControllers.forEach(controllerClass => {
            const instance = container.resolve(controllerClass);
            const endpoints: EndpointMetadata[] = Reflect.getMetadata(METADATA_KEYS.ENDPOINTS, controllerClass) || [];

            endpoints.filter(e => e.protocol === 'ws').forEach(endpoint => {
                logger.info(`[RouterHub] Found WS Event ${endpoint.path} on ${controllerClass.name}`);
                // Implementation will follow when socket.io is added
            });
        });
    }
}
