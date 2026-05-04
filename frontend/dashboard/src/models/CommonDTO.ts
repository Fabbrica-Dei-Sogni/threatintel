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

interface TimeConfigAgo {
    [unit: string]: number; // es: { days: 10 }
}

interface TimeConfigRange {
    from: {
        [unit: string]: number;
    };
    to: {
        [unit: string]: number;
    };
    fromDate: string | null;
    toDate: string | null;
}

export type SortFields = Record<string, 1 | -1> | null;

export type TimeConfig = TimeConfigAgo | TimeConfigRange | null;
