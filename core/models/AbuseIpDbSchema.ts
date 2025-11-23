import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAbuseIpDb extends Document {
    ip: string;
    lastReportedAt: Date | null;
    totalReports: number;
    abuseConfidenceScore: number;
    isListed: boolean;
    categories: number[];
    countryCode: string | null;
    domain: string | null;
    isp: string | null;
    isTor: boolean;
    isWhitelisted: boolean;
    usageType: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const AbuseIpDbSchema: Schema = new Schema({
    ip: { type: String, required: true, unique: true },
    lastReportedAt: { type: Date, default: null },
    totalReports: { type: Number, default: 0 },
    abuseConfidenceScore: { type: Number, default: 0 },
    isListed: { type: Boolean, default: false },
    categories: { type: [Number], default: [] },
    countryCode: { type: String, default: null },
    domain: { type: String, default: null },
    isp: { type: String, default: null },
    isTor: { type: Boolean, default: false },
    isWhitelisted: { type: Boolean, default: false },
    usageType: { type: String, default: null }
}, { timestamps: true });

const AbuseIpDb: Model<IAbuseIpDb> = mongoose.model<IAbuseIpDb>('AbuseIpDb', AbuseIpDbSchema);

export default AbuseIpDb;
