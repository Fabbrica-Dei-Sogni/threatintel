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
    ipDetailsId?: {
        ipinfo?: {
            country?: string;
            city?: string;
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
