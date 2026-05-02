/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
export interface GeoLocation {
    country: string | null;
    countryCode: string | null;
    region: string | null;
    city: string | null;
    ll: [number, number] | null;
    isp: string | null;
    timezone: string | null;
}

export interface AnalysisResult {
    score: number;
    tags: string[];
    indicators: string[];
    suspicious: boolean;
    isBot: boolean;
}

export interface ThreatLogEntry {
    timestamp: Date;
    ip: string;
    protocol: string;
    port: number;
    service?: string;
    action?: string;
    score: number;
    tags: string[];
    geo?: GeoLocation;
    metadata?: Record<string, any>;
    analysis?: AnalysisResult;
}

export interface LogFilters {
    ip?: string;
    protocol?: string;
    startDate?: Date;
    endDate?: Date;
    minScore?: number;
    tags?: string[];
    limit?: number;
    offset?: number;
}
