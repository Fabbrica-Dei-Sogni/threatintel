import crypto from 'crypto';
import { injectable } from 'tsyringe';
import { PatternAnalysisService } from '../services/PatternAnalysisService';
import { SanitizationUtils } from './SanitizationUtils';
import { ProtocolType } from '../types/CoreConstants';
import { IThreatLog } from '../models/ThreatLogSchema';

@injectable()
export class ThreatLogFactory {
    constructor(
        private readonly patternAnalysisService: PatternAnalysisService
    ) {}

    /**
     * Crea un oggetto ThreatLog parziale partendo dai dati grezzi.
     * Centralizza la logica di hashing, geo–ip e sanitizzazione.
     */
    public createLog(params: {
        ip: string;
        protocol: ProtocolType;
        method: string;
        url: string;
        userAgent?: string;
        referer?: string;
        headers?: Record<string, any>;
        body?: any;
        query?: any;
        score?: number;
        indicators?: string[];
        suspicious?: boolean;
        isBot?: boolean;
        eventCount?: number;
        timestamp?: Date;
        id?: string;
        metadata?: Record<string, any>;
    }): Partial<IThreatLog> {
        const {
            ip, protocol, method, url, userAgent = '', referer = '',
            headers = {}, body = {}, query = {},
            score = 0, indicators = [], suspicious = false, isBot = false,
            eventCount = 1, timestamp = new Date(), id, metadata = {}
        } = params;

        // 1. Generazione ID unico se non fornito
        const requestId = id || crypto.randomBytes(16).toString('hex');

        // 2. Ottenimento GeoLocalizzazione
        const geo = this.patternAnalysisService.getGeoLocation(ip);

        // 3. Generazione Fingerprint Hash (se non presente)
        const fingerprintHash = crypto
            .createHash('md5')
            .update(`${ip}-${userAgent}-${protocol}`)
            .digest('hex');

        // 4. Costruzione oggetto base
        const logEntry: any = {
            id: requestId,
            timestamp,
            protocol,
            request: {
                ip,
                method: method.toUpperCase(),
                url,
                userAgent,
                referer,
                headers,
                body,
                query
            },
            geo,
            fingerprint: {
                hash: fingerprintHash,
                suspicious: suspicious || score > 0,
                score,
                indicators
            },
            metadata: {
                isBot,
                eventCount,
                ...metadata
            }
        };

        // 5. Sanitizzazione globale anti-XSS
        return SanitizationUtils.deepClean(logEntry);
    }
}
