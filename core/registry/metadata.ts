/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import 'reflect-metadata';

export const METADATA_KEYS = {
    ENDPOINTS: Symbol('endpoints'),
    CONTROLLER_PATH: Symbol('controller_path')
};

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'all' | 'use';
export type Protocol = 'http' | 'ws';

export interface EndpointMetadata {
    method?: HttpMethod;
    path: string;
    handlerName: string | symbol;
    protocol: Protocol;
    middlewares?: any[];
}
