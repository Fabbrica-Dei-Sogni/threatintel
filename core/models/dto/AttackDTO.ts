export default class AttackDTO {
    protocol?: string;
    /**
     * Indirizzo IP dell'attaccante. 
     * TODO: Indagare e risolvere la disambiguità tra l'IP calcolato dagli aggregati (root) 
     * e l'IP proveniente dalla request originale (request.ip). Assicurarsi che siano sempre coerenti.
     */
    ip?: string;
    // Original fields from the JS DTO (all optional for flexibility)
    _id?: string;
    timestamp?: string;
    request: {
        ip?: string;
        url?: string;
        method?: string;
        headers?: any;
        body?: any;
    } = {};
    response: {
        statusCode?: number;
        body?: any;
    } = {};
    fingerprint: {
        score?: number;
        reasons?: string[];
        riskLevel?: string;
        indicators?: string[];
    } = {};
    geoInfo?: any;
    ips?: string[];
    isDistributed?: boolean;
    logsRaggruppati?: any[];
    totaleLogs?: number;
    firstSeen?: string;
    lastSeen?: string;
    durataAttacco?: {
        ms?: number;
        minutes?: number;
        human?: string;
    };
    averageScore?: number;
    countRateLimit?: number;
    rateLimitList?: any[];
    attackPatterns?: string[];
    rps?: number;
    rpsStyle?: string;
    attackDurationMinutes?: number;
    intensityAttack?: string;
    intensityWeight?: number;
    rpsNorm?: number;
    durNorm?: number;
    scoreNorm?: number;
    durDecay?: number;
    durNormPenalized?: number;
    dangerScore?: number;
    dangerLevel?: string;

    constructor(init?: Partial<AttackDTO>) {
        Object.assign(this, init);
    }
}
