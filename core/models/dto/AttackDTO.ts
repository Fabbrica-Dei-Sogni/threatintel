export default class AttackDTO {
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
