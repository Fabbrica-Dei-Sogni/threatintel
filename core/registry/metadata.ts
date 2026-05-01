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
