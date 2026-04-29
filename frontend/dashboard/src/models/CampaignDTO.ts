import type { TimeConfig } from "./CommonDTO";

export interface CampaignNodeDTO {
    ip: string;
    totaleLogs: number;
    averageScore: number;
    firstSeen: string;
    lastSeen: string;
    attackPatterns?: string[];
    geoInfo?: {
        ipinfo?: {
            country: string;
            org: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
}

export interface CampaignDetailDTO {
    hash: string;
    ipCount: number;
    totaleLogs: number;
    averageScore: number;
    firstSeen: string;
    lastSeen: string;
    sampleUrl?: string;
    allIps: string[];
    nodes: CampaignNodeDTO[];
}

export interface CampaignSummaryDTO {
    hash: string;
    ipCount: number;
    totaleLogs: number;
    averageScore: number;
    firstSeen: string;
    lastSeen: string;
    protocols: string[];
}

export interface CorrelationWindowDTO {
    start: number;
    end: number;
    ips: string[];
}

export interface FetchCampaignsParams {
    startTime?: string | null;
    endTime?: string | null;
    timeMode?: string;
    agoValue?: number | null;
    agoUnit?: string | null;
    minIps?: number;
    minScore?: number;
    minLogsPerIp?: number;
    protocol?: string | null;
    page?: number;
    pageSize?: number;
}

export interface FetchCampaignsResponse {
    campaigns: CampaignSummaryDTO[];
    total: number;
    page: number;
    pageSize: number;
    metadata?: {
        minIpCount: number;
        maxIpCount: number;
        minScore: number;
        maxScore: number;
        minLogsPerIp: number;
        maxLogsPerIp: number;
        [key: string]: any;
    };
}
