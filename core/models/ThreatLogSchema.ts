/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IRequest {
    ip?: string;
    jndiPayload?: string | null;
    method?: string;
    url?: string;
    userAgent?: string;
    referer?: string;
    headers?: Record<string, any>;
    body?: Record<string, any>;
    query?: Record<string, any>;
    cookies?: Record<string, any>;
}

export interface IGeo {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: number[];
    timezone?: string;
    asn?: string;
    isp?: string;
}

export interface IFingerprint {
    hash?: string;
    suspicious?: boolean;
    score?: number;
    indicators?: string[];
}

export interface IResponse {
    statusCode?: number;
    responseTime?: number;
    size?: number;
}

export interface IMetadata {
    sessionId?: string;
    userAgent_parsed?: Record<string, any>;
    isBot?: boolean;
    isCrawler?: boolean;
    eventCount?: number;
}

export interface IStatusContext {
    reason?: string;
    sourceId?: string;
    updatedBy?: string;
}

export interface IThreatLog extends Document {
    id: string;
    timestamp: Date;
    request?: IRequest;
    geo?: IGeo;
    fingerprint?: IFingerprint;
    response?: IResponse;
    metadata?: IMetadata;
    ipDetailsId?: Types.ObjectId | null;
    //il campo protocol per differenziare tipi di richieste diverse da http e ssh e altri futuri
    protocol?: string;
    status?: 'active' | 'archived' | 'deleted';
    statusChangedAt?: Date;
    statusContext?: IStatusContext;
}

const RequestSchema: Schema = new Schema({
    ip: String,
    jndiPayload: { type: String, default: null },
    method: String,
    url: String,
    userAgent: String,
    referer: String,
    headers: Schema.Types.Mixed,
    body: Schema.Types.Mixed,
    query: Schema.Types.Mixed,
    cookies: Schema.Types.Mixed
}, { _id: false });

const GeoSchema: Schema = new Schema({
    country: String,
    region: String,
    city: String,
    coordinates: [Number],
    timezone: String,
    asn: String,
    isp: String
}, { _id: false });

const FingerprintSchema: Schema = new Schema({
    hash: String,
    suspicious: Boolean,
    score: Number,
    indicators: [String]
}, { _id: false });

const ResponseSchema: Schema = new Schema({
    statusCode: Number,
    responseTime: Number,
    size: Number
}, { _id: false });

const MetadataSchema: Schema = new Schema({
    sessionId: String,
    userAgent_parsed: Schema.Types.Mixed,
    isBot: Boolean,
    isCrawler: Boolean,
    eventCount: { type: Number, default: 1 }
}, { _id: false });

const ThreatLogSchema: Schema = new Schema({
    id: { type: String, unique: true, required: true },
    timestamp: { type: Date, default: Date.now },
    request: RequestSchema,
    geo: GeoSchema,
    fingerprint: FingerprintSchema,
    response: ResponseSchema,
    metadata: MetadataSchema,
    ipDetailsId: { type: Schema.Types.ObjectId, ref: 'IpDetails', default: null },
    //il campo protocol per differenziare tipi di richieste diverse da http e ssh e altri futuri
    protocol: { type: String, default: 'http' },
    status: { 
        type: String, 
        enum: ['active', 'archived', 'deleted'], 
        default: 'active',
        index: true 
    },
    statusChangedAt: { 
        type: Date, 
        default: Date.now 
    },
    statusContext: {
        reason: String,
        sourceId: String,
        updatedBy: String
    }
});

// Indici per ottimizzazione performance
ThreatLogSchema.index({ status: 1, timestamp: -1 });
ThreatLogSchema.index({ protocol: 1, timestamp: 1 });
ThreatLogSchema.index({ timestamp: -1 });
ThreatLogSchema.index({ 'request.ip': 1 });
ThreatLogSchema.index({ 'fingerprint.hash': 1 });
ThreatLogSchema.index({ 'fingerprint.score': 1 });
ThreatLogSchema.index({ 'fingerprint.suspicious': 1 });

const ThreatLog: Model<IThreatLog> = mongoose.model<IThreatLog>('ThreatLog', ThreatLogSchema);

export default ThreatLog;
