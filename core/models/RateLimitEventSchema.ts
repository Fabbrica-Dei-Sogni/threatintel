import mongoose, { Document, Model, Schema } from 'mongoose';

export type LimitType = 'ddos-protection' | 'critical-endpoints' | 'trap-endpoints' | 'application';

export interface IRateLimitEvent extends Document {
    ip: string;
    userAgent?: string;
    path: string;
    method?: string;
    limitType: LimitType;
    timestamp: Date;
    headers?: Record<string, any>;
    honeypotId?: string;
    message?: string;
}

const RateLimitEventSchema: Schema = new Schema({
    ip: { type: String, required: true },
    userAgent: { type: String },
    path: { type: String, required: true },
    method: { type: String },
    limitType: {
        type: String,
        enum: ['ddos-protection', 'critical-endpoints', 'trap-endpoints', 'application'],
        required: true
    },
    timestamp: { type: Date, default: Date.now },
    headers: { type: Schema.Types.Mixed },
    honeypotId: { type: String },
    message: { type: String }
});

const RateLimitEvent: Model<IRateLimitEvent> = mongoose.model<IRateLimitEvent>('RateLimitEvent', RateLimitEventSchema);

export default RateLimitEvent;
