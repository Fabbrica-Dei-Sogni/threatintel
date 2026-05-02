/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
export enum ServiceStatus {
    IDLE = 'IDLE',
    STARTING = 'STARTING',
    RUNNING = 'RUNNING',
    FAILED = 'FAILED',
    DEGRADED = 'DEGRADED'
}

export interface ILongRunningService {
    serviceName: string;
    start(): Promise<void>;
    stop(): void;
    getStatus(): ServiceStatus;
}
