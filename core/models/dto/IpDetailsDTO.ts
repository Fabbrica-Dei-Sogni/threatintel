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
    id?: string;
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
            abuseipdbId: obj.abuseipdbId,
            id: obj._id?.toString()
        };
    }
}
