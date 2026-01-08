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
    isCrawler: Boolean
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
    protocol: { type: String, default: 'http' }
});

const ThreatLog: Model<IThreatLog> = mongoose.model<IThreatLog>('ThreatLog', ThreatLogSchema);

export default ThreatLog;
