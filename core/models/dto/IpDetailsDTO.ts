/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { IIpDetails } from '../IpDetailsSchema';
import { SanitizationUtils } from '../../utils/SanitizationUtils';

export interface IpDetailsDTO {
    ip: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    enrichedAt: Date;
    ipinfo: Record<string, any> | null;
    whois_raw: string | null;
    abuseipdbId?: any;
}

export class IpDetailsMapper {
    static toDTO(model: IIpDetails): IpDetailsDTO {
        const obj = model.toObject ? model.toObject() : model;
        
        return {
            ip: obj.ip,
            firstSeenAt: obj.firstSeenAt,
            lastSeenAt: obj.lastSeenAt,
            enrichedAt: obj.enrichedAt,
            ipinfo: obj.ipinfo,
            whois_raw: SanitizationUtils.sanitizeRawString(obj.whois_raw),
            abuseipdbId: obj.abuseipdbId
        };
    }
}
