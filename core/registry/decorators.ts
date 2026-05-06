/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { METADATA_KEYS, EndpointMetadata, HttpMethod, Protocol } from './metadata';

function createMappingDecorator(method: HttpMethod | undefined, path: string, protocol: Protocol, middlewares: any[] = []) {
    return (target: any, propertyKey: string | symbol | any, _descriptor?: any) => {
        const endpoints: EndpointMetadata[] = Reflect.getMetadata(METADATA_KEYS.ENDPOINTS, target.constructor) || [];
        
        endpoints.push({
            method,
            path,
            protocol,
            handlerName: propertyKey,
            middlewares
        });

        Reflect.defineMetadata(METADATA_KEYS.ENDPOINTS, endpoints, target.constructor);
    };
}

export function Get(path: string, middlewares?: any[]) {
    return createMappingDecorator('get', path, 'http', middlewares);
}

export function Post(path: string, middlewares?: any[]) {
    return createMappingDecorator('post', path, 'http', middlewares);
}

export function Put(path: string, middlewares?: any[]) {
    return createMappingDecorator('put', path, 'http', middlewares);
}

export function Patch(path: string, middlewares?: any[]) {
    return createMappingDecorator('patch', path, 'http', middlewares);
}

export function Delete(path: string, middlewares?: any[]) {
    return createMappingDecorator('delete', path, 'http', middlewares);
}

export function All(path: string, middlewares?: any[]) {
    return createMappingDecorator('all', path, 'http', middlewares);
}

export function Use(path: string = '*', middlewares?: any[]) {
    return createMappingDecorator('use', path, 'http', middlewares);
}

export function WebSocket(event: string) {
    return createMappingDecorator(undefined, event, 'ws');
}

export function Controller(basePath: string) {
    return (target: any) => {
        Reflect.defineMetadata(METADATA_KEYS.CONTROLLER_PATH, basePath, target);
    };
}
