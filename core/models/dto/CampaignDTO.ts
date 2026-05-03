export default class CampaignDTO {
    hash: string = '';
    ipCount: number = 0;
    totaleLogs: number = 0;
    firstSeen: string | Date = '';
    lastSeen: string | Date = '';
    averageScore: number = 0;
    attackPatterns: string[] = [];
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
