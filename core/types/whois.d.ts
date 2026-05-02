/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
declare module 'whois' {
    export interface LookupOptions {
        server?: string;
        follow?: number;
        timeout?: number;
        [key: string]: any;
    }

    export function lookup(
        address: string,
        callback: (err: Error | null, data: string) => void
    ): void;

    export function lookup(
        address: string,
        options: LookupOptions,
        callback: (err: Error | null, data: string) => void
    ): void;
}
