/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
export default class CampaignDTO {
    hash: string = '';
    ipCount: number = 0;
    totaleLogs: number = 0;
    firstSeen: string | Date = '';
    lastSeen: string | Date = '';
    averageScore: number = 0;
    attackPatterns: string[] = [];
    protocols: string[] = [];
    status?: 'active' | 'archived' | 'deleted';
    sampleUrl: string = '/';
    correlationHubsCount?: number;
    maxLogsInThisCampaign?: number;
    allIps?: string[];
    
    // Campi opzionali per estensioni future o metadati
    metadata?: any;

    constructor(init?: Partial<CampaignDTO>) {
        Object.assign(this, init);
    }
}
