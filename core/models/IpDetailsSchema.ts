import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IIpDetails extends Document {
    ip: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    enrichedAt: Date;
    ipinfo: Record<string, any> | null;
    whois_raw: string | null;
    abuseipdbId?: Schema.Types.ObjectId | null;
}

const IpDetailsSchema: Schema = new Schema({
    ip: { type: String, unique: true, required: true },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    enrichedAt: { type: Date, default: Date.now },
    ipinfo: { type: Schema.Types.Mixed, default: null },
    whois_raw: { type: String, default: null },
    abuseipdbId: { type: Schema.Types.ObjectId, ref: 'AbuseIpDb', default: null }
});

const IpDetails: Model<IIpDetails> = mongoose.model<IIpDetails>('IpDetails', IpDetailsSchema);

export default IpDetails;
