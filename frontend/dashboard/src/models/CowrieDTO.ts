/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

// src/models/CowrieDTO.ts

export interface CowrieSession {
    _id: string;
    session: string;
    starttime: string;
    endtime?: string;
    src_ip: string;
    dst_ip: string;
    dst_port: number;
    protocol: string;
    eventCount?: number;
    duration?: number;
    occurrenceCount?: number;
    isAggregated?: boolean;
    isScannerActivity?: boolean;
    scannerStats?: {
        totalOccurrences: number;
        firstSeen: string;
        lastSeen: string;
        duration: number;
    };
    ipDetailsId?: {
        ipinfo?: {
            country?: string;
            city?: string;
            org?: string;
            loc?: string;
        }
    };
}

export interface CowrieEvent {
    _id: string;
    session: string;
    timestamp: string;
    eventid: string;
    src_ip: string;
    message?: string;
    input?: string;
    username?: string;
    password?: string;
    url?: string;
    shasum?: string;
}

export interface FetchCowrieSessionsResponse {
    sessions: CowrieSession[];
    total: number;
    page: number;
    pageSize: number;
}
